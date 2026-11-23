package com.jfmprinthub.report;

import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.report.export.ReportTable;
import com.jfmprinthub.report.export.ReportTable.Column;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * All reports are computed with SQL in the Asia/Manila business day so the numbers match the shop's
 * calendar. Revenue = completed sales (POS + claimed job orders). COGS = recorded line costs.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    public enum GroupBy { DAY, WEEK, MONTH }

    private static final String TZ = "'Asia/Manila'";
    private static final DateTimeFormatter LABEL_DAY = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter LABEL_MONTH = DateTimeFormatter.ofPattern("MMM yyyy");
    private static final DateTimeFormatter LONG = DateTimeFormatter.ofPattern("MMM d, yyyy");

    private final NamedParameterJdbcTemplate jdbc;

    public ReportResult run(String type, LocalDate from, LocalDate to, GroupBy groupBy, String order) {
        LocalDate f = from != null ? from : BusinessTime.today().withDayOfMonth(1);
        LocalDate t = to != null ? to : BusinessTime.today();
        if (t.isBefore(f)) throw new BusinessException("INVALID_RANGE", "'to' must be on or after 'from'");
        return switch (type) {
            case "sales" -> sales(f, t, groupBy == null ? autoGroup(f, t) : groupBy);
            case "profit-loss" -> profitAndLoss(f, t);
            case "inventory-valuation" -> inventoryValuation();
            case "stock-movements" -> stockMovements(f, t);
            case "best-sellers" -> bestSellers(f, t, "worst".equalsIgnoreCase(order));
            case "services-performance" -> servicesPerformance(f, t);
            case "purchases" -> purchases(f, t);
            case "low-stock" -> lowStock();
            case "expenses" -> expenses(f, t);
            case "cash-closing" -> cashClosing(to != null ? to : BusinessTime.today());
            default -> throw new BusinessException("UNKNOWN_REPORT", "Unknown report: " + type);
        };
    }

    // ------------------------------------------------------------------ Sales

    public ReportResult sales(LocalDate from, LocalDate to, GroupBy g) {
        String trunc = g.name().toLowerCase();
        var p = range(from, to);
        Map<LocalDate, Map<String, Object>> byPeriod = new LinkedHashMap<>();
        for (LocalDate d : periods(from, to, g)) {
            byPeriod.put(d, ReportTable.row("period", d, "label", label(d, g), "orders", 0L, "gross", BigDecimal.ZERO,
                    "discounts", BigDecimal.ZERO, "net", BigDecimal.ZERO, "cost", BigDecimal.ZERO, "profit", BigDecimal.ZERO,
                    "products", BigDecimal.ZERO, "services", BigDecimal.ZERO));
        }
        jdbc.query("""
                SELECT date_trunc('%s', s.sold_at AT TIME ZONE %s)::date AS period, count(*) AS orders,
                       sum(s.subtotal) AS gross, sum(s.discount_amount) AS discounts, sum(s.total) AS net, sum(s.cost_total) AS cost
                  FROM sales s
                 WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to
                 GROUP BY 1 ORDER BY 1
                """.formatted(trunc, TZ), p, rs -> {
            Map<String, Object> row = byPeriod.get(rs.getDate("period").toLocalDate());
            if (row == null) return;
            row.put("orders", rs.getLong("orders"));
            row.put("gross", rs.getBigDecimal("gross"));
            row.put("discounts", rs.getBigDecimal("discounts"));
            row.put("net", rs.getBigDecimal("net"));
            row.put("cost", rs.getBigDecimal("cost"));
            row.put("profit", rs.getBigDecimal("net").subtract(rs.getBigDecimal("cost")));
        });
        jdbc.query("""
                SELECT date_trunc('%s', s.sold_at AT TIME ZONE %s)::date AS period,
                       COALESCE(sum(i.line_total) FILTER (WHERE i.line_type = 'PRODUCT'), 0) AS products,
                       COALESCE(sum(i.line_total) FILTER (WHERE i.line_type = 'SERVICE'), 0) AS services
                  FROM sale_items i JOIN sales s ON s.id = i.sale_id
                 WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to
                 GROUP BY 1
                """.formatted(trunc, TZ), p, rs -> {
            Map<String, Object> row = byPeriod.get(rs.getDate("period").toLocalDate());
            if (row == null) return;
            row.put("products", rs.getBigDecimal("products"));
            row.put("services", rs.getBigDecimal("services"));
        });
        List<Map<String, Object>> rows = new ArrayList<>(byPeriod.values());
        Map<String, Object> totals = totals(rows, "orders", "gross", "discounts", "net", "cost", "profit", "products", "services");
        totals.put("label", "TOTAL");
        BigDecimal net = (BigDecimal) totals.get("net");
        long orders = ((Number) totals.get("orders")).longValue();
        Map<String, Object> summary = ReportTable.row("netSales", net, "orders", orders,
                "grossProfit", totals.get("profit"), "averageOrder", orders == 0 ? BigDecimal.ZERO : net.divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP),
                "margin", pct((BigDecimal) totals.get("profit"), net));
        ReportTable table = new ReportTable("Sales Report", periodLabel(from, to),
                List.of(Column.text("label", "Period"), Column.number("orders", "Orders"), Column.money("gross", "Gross Sales"),
                        Column.money("discounts", "Discounts"), Column.money("net", "Net Sales"), Column.money("products", "Products"),
                        Column.money("services", "Services"), Column.money("cost", "COGS"), Column.money("profit", "Gross Profit")),
                rows, totals);
        return new ReportResult("sales", "Sales Report", periodLabel(from, to), summary, rows, table);
    }

    // ------------------------------------------------------------------ Profit & Loss

    public ReportResult profitAndLoss(LocalDate from, LocalDate to) {
        var p = range(from, to);
        Map<String, Object> s = jdbc.queryForMap("""
                SELECT COALESCE(sum(subtotal), 0) AS gross, COALESCE(sum(discount_amount), 0) AS discounts,
                       COALESCE(sum(total), 0) AS revenue, COALESCE(sum(cost_total), 0) AS cogs, COALESCE(sum(tax_amount), 0) AS tax
                  FROM sales WHERE status = 'COMPLETED' AND sold_at >= :from AND sold_at < :to
                """, p);
        BigDecimal revenue = (BigDecimal) s.get("revenue");
        BigDecimal cogs = (BigDecimal) s.get("cogs");
        BigDecimal grossProfit = revenue.subtract(cogs);

        List<Map<String, Object>> expenseRows = jdbc.queryForList("""
                SELECT c.name AS category, COALESCE(sum(e.amount), 0) AS amount
                  FROM expenses e JOIN expense_categories c ON c.id = e.category_id
                 WHERE e.expense_date BETWEEN :fromDate AND :toDate
                 GROUP BY c.name ORDER BY amount DESC
                """, p);
        BigDecimal expenses = expenseRows.stream().map(r -> (BigDecimal) r.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal net = grossProfit.subtract(expenses);

        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(ReportTable.row("line", "Gross sales", "amount", s.get("gross")));
        rows.add(ReportTable.row("line", "Less: discounts", "amount", ((BigDecimal) s.get("discounts")).negate()));
        rows.add(ReportTable.row("line", "Net revenue", "amount", revenue));
        rows.add(ReportTable.row("line", "Less: cost of goods / materials", "amount", cogs.negate()));
        rows.add(ReportTable.row("line", "GROSS PROFIT", "amount", grossProfit));
        for (Map<String, Object> e : expenseRows) {
            rows.add(ReportTable.row("line", "Expense — " + e.get("category"), "amount", ((BigDecimal) e.get("amount")).negate()));
        }
        rows.add(ReportTable.row("line", "Total operating expenses", "amount", expenses.negate()));

        // Monthly chart
        List<Map<String, Object>> chart = new ArrayList<>();
        Map<LocalDate, Map<String, Object>> months = new LinkedHashMap<>();
        for (LocalDate m : periods(from, to, GroupBy.MONTH)) {
            Map<String, Object> r = ReportTable.row("label", label(m, GroupBy.MONTH), "revenue", BigDecimal.ZERO,
                    "cogs", BigDecimal.ZERO, "expenses", BigDecimal.ZERO, "net", BigDecimal.ZERO);
            months.put(m, r);
            chart.add(r);
        }
        jdbc.query("""
                SELECT date_trunc('month', sold_at AT TIME ZONE %s)::date AS m, sum(total) AS revenue, sum(cost_total) AS cogs
                  FROM sales WHERE status = 'COMPLETED' AND sold_at >= :from AND sold_at < :to GROUP BY 1
                """.formatted(TZ), p, rs -> {
            var r = months.get(rs.getDate("m").toLocalDate());
            if (r != null) { r.put("revenue", rs.getBigDecimal("revenue")); r.put("cogs", rs.getBigDecimal("cogs")); }
        });
        jdbc.query("""
                SELECT date_trunc('month', expense_date)::date AS m, sum(amount) AS expenses
                  FROM expenses WHERE expense_date BETWEEN :fromDate AND :toDate GROUP BY 1
                """, p, rs -> {
            var r = months.get(rs.getDate("m").toLocalDate());
            if (r != null) r.put("expenses", rs.getBigDecimal("expenses"));
        });
        chart.forEach(r -> r.put("net", ((BigDecimal) r.get("revenue")).subtract((BigDecimal) r.get("cogs")).subtract((BigDecimal) r.get("expenses"))));

        Map<String, Object> summary = ReportTable.row("revenue", revenue, "cogs", cogs, "grossProfit", grossProfit,
                "expenses", expenses, "netProfit", net, "netMargin", pct(net, revenue));
        ReportTable table = new ReportTable("Profit & Loss", periodLabel(from, to),
                List.of(Column.text("line", "Line"), Column.money("amount", "Amount")), rows,
                ReportTable.row("line", "NET PROFIT", "amount", net));
        return new ReportResult("profit-loss", "Profit & Loss", periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Inventory valuation

    public ReportResult inventoryValuation() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.sku, p.name, COALESCE(c.name, 'Uncategorized') AS category,
                       CASE WHEN p.is_material THEN 'Material' ELSE 'Retail' END AS type, p.unit,
                       p.stock_on_hand AS qty, p.cost_price AS cost, p.selling_price AS price,
                       round(GREATEST(p.stock_on_hand, 0) * p.cost_price, 2) AS value,
                       CASE WHEN p.is_material THEN 0 ELSE round(GREATEST(p.stock_on_hand, 0) * p.selling_price, 2) END AS retail
                  FROM products p LEFT JOIN categories c ON c.id = p.category_id
                 WHERE p.archived = false
                 ORDER BY value DESC, p.name
                """, new MapSqlParameterSource());
        Map<String, BigDecimal> byCat = new LinkedHashMap<>();
        rows.forEach(r -> byCat.merge((String) r.get("category"), (BigDecimal) r.get("value"), BigDecimal::add));
        List<Map<String, Object>> chart = byCat.entrySet().stream()
                .map(e -> ReportTable.row("label", e.getKey(), "value", e.getValue())).toList();
        Map<String, Object> totals = totals(rows, "value", "retail");
        totals.put("name", "TOTAL");
        BigDecimal retailItemsCost = rows.stream().filter(r -> "Retail".equals(r.get("type")))
                .map(r -> (BigDecimal) r.get("value")).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal materialsValue = ((BigDecimal) totals.get("value")).subtract(retailItemsCost);
        Map<String, Object> summary = ReportTable.row("inventoryValue", totals.get("value"), "materialsValue", materialsValue,
                "retailValue", totals.get("retail"), "items", rows.size(),
                "potentialMargin", ((BigDecimal) totals.get("retail")).subtract(retailItemsCost));
        ReportTable table = new ReportTable("Inventory Valuation", "As of " + LONG.format(BusinessTime.today()) + " • weighted average cost",
                List.of(Column.text("sku", "SKU"), Column.text("name", "Product"), Column.text("category", "Category"),
                        Column.text("type", "Type"), Column.text("unit", "Unit"), Column.number("qty", "On Hand"),
                        Column.money("cost", "Avg Cost"), Column.money("value", "Cost Value"), Column.money("price", "Price"),
                        Column.money("retail", "Retail Value")), rows, totals);
        return new ReportResult("inventory-valuation", "Inventory Valuation", "Current", summary, chart, table);
    }

    // ------------------------------------------------------------------ Stock movement

    public ReportResult stockMovements(LocalDate from, LocalDate to) {
        var p = range(from, to);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.sku, p.name, p.unit,
                       COALESCE(sum(m.quantity) FILTER (WHERE m.quantity > 0), 0) AS qty_in,
                       COALESCE(-sum(m.quantity) FILTER (WHERE m.quantity < 0), 0) AS qty_out,
                       COALESCE(sum(m.quantity), 0) AS net,
                       count(m.id) AS movements,
                       p.stock_on_hand AS on_hand
                  FROM products p JOIN stock_movements m ON m.product_id = p.id
                 WHERE m.created_at >= :from AND m.created_at < :to
                 GROUP BY p.id, p.sku, p.name, p.unit, p.stock_on_hand
                 ORDER BY movements DESC, p.name
                """, p);
        List<Map<String, Object>> chart = jdbc.queryForList("""
                SELECT reason AS label, count(*) AS count, COALESCE(sum(abs(quantity * unit_cost)), 0) AS value
                  FROM stock_movements WHERE created_at >= :from AND created_at < :to
                 GROUP BY reason ORDER BY count DESC
                """, p);
        long total = rows.stream().mapToLong(r -> ((Number) r.get("movements")).longValue()).sum();
        Map<String, Object> summary = ReportTable.row("movements", total, "products", rows.size(), "reasons", chart.size());
        ReportTable table = new ReportTable("Stock Movement Report", periodLabel(from, to),
                List.of(Column.text("sku", "SKU"), Column.text("name", "Product"), Column.text("unit", "Unit"),
                        Column.number("qty_in", "Qty In"), Column.number("qty_out", "Qty Out"), Column.number("net", "Net"),
                        Column.number("movements", "# Movements"), Column.number("on_hand", "On Hand Now")), rows, null);
        return new ReportResult("stock-movements", "Stock Movement Report", periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Best / worst sellers

    public ReportResult bestSellers(LocalDate from, LocalDate to, boolean worst) {
        var p = range(from, to);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT x.kind, x.name, x.sku, x.qty, x.revenue, x.cost, x.revenue - x.cost AS profit FROM (
                    SELECT 'Product' AS kind, pr.name, pr.sku,
                           COALESCE(sum(i.quantity), 0) AS qty, COALESCE(sum(i.line_total), 0) AS revenue,
                           COALESCE(sum(i.cost_total), 0) AS cost
                      FROM products pr
                      LEFT JOIN sale_items i ON i.product_id = pr.id
                       AND i.sale_id IN (SELECT id FROM sales WHERE status = 'COMPLETED' AND sold_at >= :from AND sold_at < :to)
                     WHERE pr.archived = false AND pr.is_material = false
                     GROUP BY pr.id, pr.name, pr.sku
                    UNION ALL
                    SELECT 'Service', sv.name, sv.code,
                           COALESCE(sum(i.quantity), 0), COALESCE(sum(i.line_total), 0), COALESCE(sum(i.cost_total), 0)
                      FROM services sv
                      LEFT JOIN sale_items i ON i.service_id = sv.id
                       AND i.sale_id IN (SELECT id FROM sales WHERE status = 'COMPLETED' AND sold_at >= :from AND sold_at < :to)
                     WHERE sv.archived = false
                     GROUP BY sv.id, sv.name, sv.code
                ) x
                ORDER BY x.revenue %s, x.qty %s, x.name
                LIMIT 50
                """.formatted(worst ? "ASC" : "DESC", worst ? "ASC" : "DESC"), p);
        int rank = 1;
        for (Map<String, Object> r : rows) r.put("rank", rank++);
        List<Map<String, Object>> chart = rows.stream().limit(10)
                .map(r -> ReportTable.row("label", r.get("name"), "revenue", r.get("revenue"), "qty", r.get("qty"))).toList();
        String title = worst ? "Slow Movers" : "Best Sellers";
        Map<String, Object> summary = ReportTable.row("top", rows.isEmpty() ? null : rows.get(0).get("name"),
                "items", rows.size(), "revenue", totals(rows, "revenue").get("revenue"));
        ReportTable table = new ReportTable(title, periodLabel(from, to),
                List.of(Column.number("rank", "#"), Column.text("kind", "Type"), Column.text("sku", "Code"), Column.text("name", "Item"),
                        Column.number("qty", "Qty Sold"), Column.money("revenue", "Revenue"), Column.money("cost", "Cost"),
                        Column.money("profit", "Profit")), rows, null);
        return new ReportResult("best-sellers", title, periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Services performance

    public ReportResult servicesPerformance(LocalDate from, LocalDate to) {
        var p = range(from, to);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT sv.code, sv.name, sv.pricing_model AS model,
                       count(i.id) AS orders, COALESCE(sum(i.line_total), 0) AS revenue,
                       COALESCE(sum(i.cost_total), 0) AS material_cost,
                       COALESCE(sum(i.line_total), 0) - COALESCE(sum(i.cost_total), 0) AS margin,
                       (SELECT count(*) FROM job_order_items ji JOIN job_orders j ON j.id = ji.job_order_id
                         WHERE ji.service_id = sv.id AND j.status NOT IN ('CLAIMED', 'CANCELLED')) AS open_jobs
                  FROM services sv
                  LEFT JOIN sale_items i ON i.service_id = sv.id
                   AND i.sale_id IN (SELECT id FROM sales WHERE status = 'COMPLETED' AND sold_at >= :from AND sold_at < :to)
                 WHERE sv.archived = false
                 GROUP BY sv.id, sv.code, sv.name, sv.pricing_model
                 ORDER BY revenue DESC
                """, p);
        rows.forEach(r -> r.put("margin_pct", pct((BigDecimal) r.get("margin"), (BigDecimal) r.get("revenue"))));
        List<Map<String, Object>> chart = rows.stream()
                .map(r -> ReportTable.row("label", r.get("name"), "revenue", r.get("revenue"), "margin", r.get("margin"))).toList();
        Map<String, Object> totals = totals(rows, "orders", "revenue", "material_cost", "margin", "open_jobs");
        totals.put("name", "TOTAL");
        Map<String, Object> summary = ReportTable.row("revenue", totals.get("revenue"), "margin", totals.get("margin"),
                "marginPct", pct((BigDecimal) totals.get("margin"), (BigDecimal) totals.get("revenue")), "openJobs", totals.get("open_jobs"));
        ReportTable table = new ReportTable("Services Performance", periodLabel(from, to),
                List.of(Column.text("code", "Code"), Column.text("name", "Service"), Column.text("model", "Pricing"),
                        Column.number("orders", "Orders"), Column.money("revenue", "Revenue"), Column.money("material_cost", "Materials"),
                        Column.money("margin", "Margin"), Column.percent("margin_pct", "Margin %"), Column.number("open_jobs", "Open Jobs")),
                rows, totals);
        return new ReportResult("services-performance", "Services Performance", periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Purchases

    public ReportResult purchases(LocalDate from, LocalDate to) {
        var p = range(from, to);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT po.po_number, s.name AS supplier, po.status, po.order_date,
                       po.total_amount AS ordered,
                       COALESCE((SELECT sum(qty_received * unit_cost) FROM purchase_order_items WHERE purchase_order_id = po.id), 0) AS received,
                       po.amount_paid AS paid,
                       CASE WHEN po.status IN ('DRAFT', 'CANCELLED') THEN 0 ELSE GREATEST(po.total_amount - po.amount_paid, 0) END AS balance
                  FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
                 WHERE po.order_date BETWEEN :fromDate AND :toDate AND po.status <> 'CANCELLED'
                 ORDER BY po.order_date DESC, po.po_number DESC
                """, p);
        rows.forEach(r -> { Object d = r.get("order_date"); if (d instanceof Date sd) r.put("order_date", sd.toLocalDate()); });
        Map<String, BigDecimal> bySupplier = new LinkedHashMap<>();
        rows.forEach(r -> bySupplier.merge((String) r.get("supplier"), (BigDecimal) r.get("received"), BigDecimal::add));
        List<Map<String, Object>> chart = bySupplier.entrySet().stream()
                .map(e -> ReportTable.row("label", e.getKey(), "value", e.getValue())).toList();
        Map<String, Object> totals = totals(rows, "ordered", "received", "paid", "balance");
        totals.put("po_number", "TOTAL");
        Map<String, Object> summary = ReportTable.row("orders", rows.size(), "ordered", totals.get("ordered"),
                "received", totals.get("received"), "paid", totals.get("paid"), "payables", totals.get("balance"));
        ReportTable table = new ReportTable("Purchases Report", periodLabel(from, to),
                List.of(Column.text("po_number", "PO #"), Column.text("supplier", "Supplier"), Column.text("status", "Status"),
                        Column.date("order_date", "Order Date"), Column.money("ordered", "Ordered"), Column.money("received", "Received"),
                        Column.money("paid", "Paid"), Column.money("balance", "Balance")), rows, totals);
        return new ReportResult("purchases", "Purchases Report", periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Low stock

    public ReportResult lowStock() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.sku, p.name, p.unit, p.stock_on_hand AS on_hand, p.reorder_level AS reorder_level,
                       GREATEST(p.reorder_level * 2 - p.stock_on_hand, 0) AS suggested,
                       COALESCE(s.name, '—') AS supplier,
                       CASE WHEN p.stock_on_hand <= 0 THEN 'OUT' ELSE 'LOW' END AS status
                  FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
                 WHERE p.archived = false AND p.stock_on_hand <= p.reorder_level
                 ORDER BY p.stock_on_hand / NULLIF(p.reorder_level, 0) NULLS FIRST, p.name
                """, new MapSqlParameterSource());
        List<Map<String, Object>> chart = rows.stream()
                .map(r -> ReportTable.row("label", r.get("name"), "onHand", r.get("on_hand"), "reorderLevel", r.get("reorder_level"))).toList();
        long out = rows.stream().filter(r -> "OUT".equals(r.get("status"))).count();
        Map<String, Object> summary = ReportTable.row("lowStock", rows.size() - out, "outOfStock", out, "total", rows.size());
        ReportTable table = new ReportTable("Low Stock Report", "As of " + LONG.format(BusinessTime.today()),
                List.of(Column.text("sku", "SKU"), Column.text("name", "Product"), Column.text("unit", "Unit"),
                        Column.text("status", "Status"), Column.number("on_hand", "On Hand"), Column.number("reorder_level", "Reorder Lvl"),
                        Column.number("suggested", "Suggested Qty"), Column.text("supplier", "Supplier")), rows, null);
        return new ReportResult("low-stock", "Low Stock Report", "Current", summary, chart, table);
    }

    // ------------------------------------------------------------------ Expenses

    public ReportResult expenses(LocalDate from, LocalDate to) {
        var p = range(from, to);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT e.expense_date, c.name AS category, e.description, e.payment_method, e.amount
                  FROM expenses e JOIN expense_categories c ON c.id = e.category_id
                 WHERE e.expense_date BETWEEN :fromDate AND :toDate
                 ORDER BY e.expense_date DESC
                """, p);
        rows.forEach(r -> { Object d = r.get("expense_date"); if (d instanceof Date sd) r.put("expense_date", sd.toLocalDate()); });
        Map<String, BigDecimal> byCat = new LinkedHashMap<>();
        rows.forEach(r -> byCat.merge((String) r.get("category"), (BigDecimal) r.get("amount"), BigDecimal::add));
        List<Map<String, Object>> chart = byCat.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> ReportTable.row("label", e.getKey(), "value", e.getValue())).toList();
        Map<String, Object> totals = totals(rows, "amount");
        totals.put("category", "TOTAL");
        Map<String, Object> summary = ReportTable.row("total", totals.get("amount"), "entries", rows.size(),
                "topCategory", chart.isEmpty() ? null : chart.get(0).get("label"));
        ReportTable table = new ReportTable("Expenses Report", periodLabel(from, to),
                List.of(Column.date("expense_date", "Date"), Column.text("category", "Category"), Column.text("description", "Description"),
                        Column.text("payment_method", "Paid Via"), Column.money("amount", "Amount")), rows, totals);
        return new ReportResult("expenses", "Expenses Report", periodLabel(from, to), summary, chart, table);
    }

    // ------------------------------------------------------------------ Daily cash closing

    public ReportResult cashClosing(LocalDate day) {
        var p = range(day, day);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT m.method,
                       COALESCE(pin.count, 0) AS transactions,
                       COALESCE(pin.amount, 0) AS collected,
                       COALESCE(eout.amount, 0) AS expenses_paid,
                       COALESCE(pin.amount, 0) - COALESCE(eout.amount, 0) AS net
                  FROM (VALUES ('CASH'), ('GCASH'), ('MAYA'), ('BANK_TRANSFER')) AS m(method)
                  LEFT JOIN (SELECT method, count(*) AS count, sum(amount) AS amount FROM payments
                              WHERE voided = false AND paid_at >= :from AND paid_at < :to GROUP BY method) pin ON pin.method = m.method
                  LEFT JOIN (SELECT payment_method AS method, sum(amount) AS amount FROM expenses
                              WHERE expense_date = :fromDate GROUP BY payment_method) eout ON eout.method = m.method
                """, p);
        Map<String, Object> s = jdbc.queryForMap("""
                SELECT count(*) FILTER (WHERE status = 'COMPLETED') AS sales,
                       COALESCE(sum(total) FILTER (WHERE status = 'COMPLETED'), 0) AS sales_total,
                       count(*) FILTER (WHERE status = 'VOIDED') AS voids,
                       COALESCE(sum(total) FILTER (WHERE status = 'VOIDED'), 0) AS voided_total
                  FROM sales WHERE sold_at >= :from AND sold_at < :to
                """, p);
        BigDecimal downpayments = jdbc.queryForObject("""
                SELECT COALESCE(sum(amount), 0) FROM payments
                 WHERE voided = false AND sale_id IS NULL AND job_order_id IS NOT NULL AND paid_at >= :from AND paid_at < :to
                """, p, BigDecimal.class);
        Map<String, Object> totals = totals(rows, "transactions", "collected", "expenses_paid", "net");
        totals.put("method", "TOTAL");
        BigDecimal cashNet = rows.stream().filter(r -> "CASH".equals(r.get("method"))).map(r -> (BigDecimal) r.get("net")).findFirst().orElse(BigDecimal.ZERO);
        Map<String, Object> summary = ReportTable.row("date", day, "salesCount", s.get("sales"), "salesTotal", s.get("sales_total"),
                "voids", s.get("voids"), "voidedTotal", s.get("voided_total"), "collected", totals.get("collected"),
                "openJobPayments", downpayments, "expectedCashInDrawer", cashNet);
        List<Map<String, Object>> chart = rows.stream().map(r -> ReportTable.row("label", r.get("method"), "value", r.get("collected"))).toList();
        ReportTable table = new ReportTable("End-of-Day Cash Closing", LONG.format(day),
                List.of(Column.text("method", "Payment Method"), Column.number("transactions", "Transactions"),
                        Column.money("collected", "Collected"), Column.money("expenses_paid", "Expenses Paid"),
                        Column.money("net", "Net")), rows, totals);
        return new ReportResult("cash-closing", "End-of-Day Cash Closing", LONG.format(day), summary, chart, table);
    }

    // ------------------------------------------------------------------ helpers

    private static MapSqlParameterSource range(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", Timestamp.from(BusinessTime.startOf(from)))
                .addValue("to", Timestamp.from(BusinessTime.endOf(to)))
                .addValue("fromDate", Date.valueOf(from))
                .addValue("toDate", Date.valueOf(to));
    }

    public static GroupBy autoGroup(LocalDate from, LocalDate to) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(from, to);
        return days > 120 ? GroupBy.MONTH : days > 45 ? GroupBy.WEEK : GroupBy.DAY;
    }

    /** Period start dates matching Postgres date_trunc semantics (weeks start Monday). */
    public static List<LocalDate> periods(LocalDate from, LocalDate to, GroupBy g) {
        List<LocalDate> list = new ArrayList<>();
        LocalDate d = switch (g) {
            case DAY -> from;
            case WEEK -> from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> from.withDayOfMonth(1);
        };
        while (!d.isAfter(to)) {
            list.add(d);
            d = switch (g) {
                case DAY -> d.plusDays(1);
                case WEEK -> d.plusWeeks(1);
                case MONTH -> d.plusMonths(1);
            };
        }
        return list;
    }

    public static String label(LocalDate d, GroupBy g) {
        return switch (g) {
            case DAY -> LABEL_DAY.format(d);
            case WEEK -> "Wk of " + LABEL_DAY.format(d);
            case MONTH -> LABEL_MONTH.format(d);
        };
    }

    private static String periodLabel(LocalDate from, LocalDate to) {
        return from.equals(to) ? LONG.format(from) : LONG.format(from) + " – " + LONG.format(to);
    }

    private static Map<String, Object> totals(List<Map<String, Object>> rows, String... keys) {
        Map<String, Object> t = new LinkedHashMap<>();
        for (String k : keys) {
            boolean integral = !rows.isEmpty() && rows.stream().allMatch(r -> r.get(k) instanceof Long || r.get(k) instanceof Integer);
            if (integral) {
                t.put(k, rows.stream().mapToLong(r -> ((Number) r.get(k)).longValue()).sum());
            } else {
                t.put(k, rows.stream().map(r -> r.get(k)).filter(v -> v != null)
                        .map(v -> v instanceof BigDecimal b ? b : new BigDecimal(v.toString()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add));
            }
        }
        return t;
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0 || part == null) return BigDecimal.ZERO;
        return part.multiply(Money.HUNDRED).divide(whole, 2, RoundingMode.HALF_UP);
    }
}
