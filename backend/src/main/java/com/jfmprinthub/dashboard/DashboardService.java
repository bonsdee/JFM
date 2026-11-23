package com.jfmprinthub.dashboard;

import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.joborder.JobOrder;
import com.jfmprinthub.joborder.JobOrderRepository;
import com.jfmprinthub.product.ProductMapper;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.report.ReportService;
import com.jfmprinthub.report.ReportService.GroupBy;
import com.jfmprinthub.report.export.ReportTable;
import com.jfmprinthub.sale.Sale;
import com.jfmprinthub.sale.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Everything the dashboard overview needs in ONE round trip (keeps first paint under 2s). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final String TZ = "'Asia/Manila'";

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final JobOrderRepository jobOrderRepository;
    private final ProductMapper productMapper;
    private final NamedParameterJdbcTemplate jdbc;

    public Map<String, Object> overview(String range) {
        LocalDate today = BusinessTime.today();
        Instant todayStart = BusinessTime.startOf(today), todayEnd = BusinessTime.endOf(today);
        Instant yStart = BusinessTime.startOf(today.minusDays(1));
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate prevMonthStart = monthStart.minusMonths(1);
        // Same elapsed portion of last month for a fair comparison
        LocalDate prevMonthSameDay = prevMonthStart.plusDays(Math.min(today.getDayOfMonth(), prevMonthStart.lengthOfMonth()) - 1);

        BigDecimal todaySales = saleRepository.totalBetween(todayStart, todayEnd);
        BigDecimal yesterdaySales = saleRepository.totalBetween(yStart, todayStart);
        BigDecimal monthSales = saleRepository.totalBetween(BusinessTime.startOf(monthStart), todayEnd);
        BigDecimal prevMonthSales = saleRepository.totalBetween(BusinessTime.startOf(prevMonthStart), BusinessTime.endOf(prevMonthSameDay));
        BigDecimal monthProfit = saleRepository.grossProfitBetween(BusinessTime.startOf(monthStart), todayEnd);
        BigDecimal prevMonthProfit = saleRepository.grossProfitBetween(BusinessTime.startOf(prevMonthStart), BusinessTime.endOf(prevMonthSameDay));

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("todaySales", kpi(todaySales, yesterdaySales, saleRepository.countBetween(todayStart, todayEnd) + " transactions"));
        kpis.put("monthSales", kpi(monthSales, prevMonthSales, "vs same period last month"));
        kpis.put("grossProfit", kpi(monthProfit, prevMonthProfit, pctLabel(monthProfit, monthSales) + " margin this month"));
        kpis.put("pendingJobs", Map.of("value", jobOrderRepository.countOpen(), "hint", "open job orders"));
        kpis.put("lowStock", Map.of("value", productRepository.countLowStock(), "hint", "at or below reorder level"));
        kpis.put("inventoryValue", Map.of("value", Money.of(productRepository.inventoryValue()), "hint", "at weighted average cost"));

        // Trend window
        LocalDate from;
        GroupBy g;
        switch (range == null ? "30d" : range) {
            case "7d" -> { from = today.minusDays(6); g = GroupBy.DAY; }
            case "12m" -> { from = today.withDayOfMonth(1).minusMonths(11); g = GroupBy.MONTH; }
            default -> { from = today.minusDays(29); g = GroupBy.DAY; }
        }
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("from", Timestamp.from(BusinessTime.startOf(from)))
                .addValue("to", Timestamp.from(todayEnd));

        String trunc = g.name().toLowerCase();
        Map<LocalDate, Map<String, Object>> trend = new LinkedHashMap<>();
        for (LocalDate d : ReportService.periods(from, today, g)) {
            trend.put(d, ReportTable.row("date", d, "label", ReportService.label(d, g), "sales", BigDecimal.ZERO,
                    "profit", BigDecimal.ZERO, "products", BigDecimal.ZERO, "services", BigDecimal.ZERO, "orders", 0L));
        }
        jdbc.query("""
                SELECT date_trunc('%s', s.sold_at AT TIME ZONE %s)::date AS d, sum(s.total) AS sales,
                       sum(s.total - s.cost_total) AS profit, count(*) AS orders
                  FROM sales s WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to GROUP BY 1
                """.formatted(trunc, TZ), p, rs -> {
            var r = trend.get(rs.getDate("d").toLocalDate());
            if (r != null) { r.put("sales", rs.getBigDecimal("sales")); r.put("profit", rs.getBigDecimal("profit")); r.put("orders", rs.getLong("orders")); }
        });
        jdbc.query("""
                SELECT date_trunc('%s', s.sold_at AT TIME ZONE %s)::date AS d,
                       COALESCE(sum(i.line_total) FILTER (WHERE i.line_type = 'PRODUCT'), 0) AS products,
                       COALESCE(sum(i.line_total) FILTER (WHERE i.line_type = 'SERVICE'), 0) AS services
                  FROM sale_items i JOIN sales s ON s.id = i.sale_id
                 WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to GROUP BY 1
                """.formatted(trunc, TZ), p, rs -> {
            var r = trend.get(rs.getDate("d").toLocalDate());
            if (r != null) { r.put("products", rs.getBigDecimal("products")); r.put("services", rs.getBigDecimal("services")); }
        });

        List<Map<String, Object>> byCategory = jdbc.queryForList("""
                SELECT COALESCE(pc.name, sc.name, CASE WHEN i.line_type = 'SERVICE' THEN 'Services' ELSE 'Uncategorized' END) AS name,
                       sum(i.line_total) AS value
                  FROM sale_items i
                  JOIN sales s ON s.id = i.sale_id
                  LEFT JOIN products pr ON pr.id = i.product_id LEFT JOIN categories pc ON pc.id = pr.category_id
                  LEFT JOIN services sv ON sv.id = i.service_id LEFT JOIN categories sc ON sc.id = sv.category_id
                 WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to
                 GROUP BY 1 ORDER BY value DESC
                """, p);

        List<Map<String, Object>> topSellers = jdbc.queryForList("""
                SELECT COALESCE(pr.name, sv.name) AS name, i.line_type AS type, sum(i.line_total) AS revenue, sum(i.quantity) AS qty
                  FROM sale_items i JOIN sales s ON s.id = i.sale_id
                  LEFT JOIN products pr ON pr.id = i.product_id LEFT JOIN services sv ON sv.id = i.service_id
                 WHERE s.status = 'COMPLETED' AND s.sold_at >= :from AND s.sold_at < :to
                 GROUP BY 1, 2 ORDER BY revenue DESC LIMIT 5
                """, p);

        List<Map<String, Object>> paymentSplit = jdbc.queryForList("""
                SELECT method AS name, sum(amount) AS value, count(*) AS count FROM payments
                 WHERE voided = false AND paid_at >= :from AND paid_at < :to GROUP BY method ORDER BY value DESC
                """, p);

        List<Map<String, Object>> recent = new ArrayList<>();
        for (Sale s : saleRepository.findTop8ByStatusOrderBySoldAtDesc(Sale.Status.COMPLETED)) {
            recent.add(ReportTable.row("id", s.getId(), "saleNumber", s.getSaleNumber(),
                    "customer", s.getCustomer() != null ? s.getCustomer().getName() : "Walk-in",
                    "source", s.getSource(), "total", s.getTotal(), "soldAt", s.getSoldAt()));
        }

        List<Map<String, Object>> upcoming = new ArrayList<>();
        for (JobOrder j : jobOrderRepository.findUpcoming(PageRequest.of(0, 6))) {
            upcoming.add(ReportTable.row("id", j.getId(), "jobNumber", j.getJobNumber(), "customer", j.displayCustomer(),
                    "status", j.getStatus(), "dueAt", j.getDueAt(), "overdue", j.isOverdue(), "balance", j.balance()));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("range", range == null ? "30d" : range);
        result.put("kpis", kpis);
        result.put("salesTrend", new ArrayList<>(trend.values()));
        result.put("salesByCategory", byCategory);
        result.put("topSellers", topSellers);
        result.put("paymentSplit", paymentSplit);
        result.put("recentTransactions", recent);
        result.put("upcomingJobs", upcoming);
        result.put("lowStock", productRepository.findLowStock().stream().limit(8).map(productMapper::toResponse).toList());
        return result;
    }

    private static Map<String, Object> kpi(BigDecimal value, BigDecimal previous, String hint) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("value", Money.of(value));
        m.put("previous", Money.of(previous));
        m.put("changePct", previous == null || previous.signum() == 0 ? null
                : value.subtract(previous).multiply(Money.HUNDRED).divide(previous, 1, RoundingMode.HALF_UP));
        m.put("hint", hint);
        return m;
    }

    private static String pctLabel(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0) return "0%";
        return part.multiply(Money.HUNDRED).divide(whole, 1, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString() + "%";
    }
}
