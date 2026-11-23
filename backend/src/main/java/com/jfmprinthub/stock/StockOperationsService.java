package com.jfmprinthub.stock;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.TimeRange;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.stock.StockDtos.CountResultLine;
import com.jfmprinthub.stock.StockDtos.MovementResponse;
import com.jfmprinthub.stock.StockDtos.PhysicalCountRequest;
import com.jfmprinthub.stock.StockDtos.ReconciliationLine;
import com.jfmprinthub.stock.StockDtos.StockInRequest;
import com.jfmprinthub.stock.StockDtos.StockOutRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Manual stock forms (in / out / physical count) and ledger queries. */
@Service
@RequiredArgsConstructor
public class StockOperationsService {

    private final StockService stockService;
    private final StockMovementRepository movementRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;

    @Transactional
    public List<MovementResponse> stockIn(StockInRequest r) {
        if (!MovementReason.MANUAL_IN.contains(r.reason())) {
            throw new BusinessException("INVALID_REASON", "Reason " + r.reason() + " is not allowed for Stock In");
        }
        List<StockPost> posts = r.items().stream()
                .map(i -> StockPost.in(i.productId(), r.reason(), i.quantity(), i.unitCost(),
                        "MANUAL", null, r.referenceNo(), r.notes()))
                .toList();
        List<StockMovement> movements = stockService.postAll(posts);
        auditService.record(AuditAction.STOCK_POST, "STOCK", null,
                "Stock IN (" + r.reason() + ") — " + movements.size() + " item(s)",
                Map.of("reference", String.valueOf(r.referenceNo()), "items", r.items().size()));
        return movements.stream().map(MovementResponse::from).toList();
    }

    @Transactional
    public List<MovementResponse> stockOut(StockOutRequest r) {
        if (!MovementReason.MANUAL_OUT.contains(r.reason())) {
            throw new BusinessException("INVALID_REASON", "Reason " + r.reason() + " is not allowed for Stock Out");
        }
        List<StockPost> posts = r.items().stream()
                .map(i -> StockPost.out(i.productId(), r.reason(), i.quantity(), "MANUAL", null, r.referenceNo(), r.notes()))
                .toList();
        List<StockMovement> movements = stockService.postAll(posts);
        auditService.record(AuditAction.STOCK_POST, "STOCK", null,
                "Stock OUT (" + r.reason() + ") — " + movements.size() + " item(s)",
                Map.of("reference", String.valueOf(r.referenceNo()), "items", r.items().size()));
        return movements.stream().map(MovementResponse::from).toList();
    }

    /** Posts the difference between counted and system quantity as PHYSICAL_COUNT adjustments. */
    @Transactional
    public List<CountResultLine> physicalCount(PhysicalCountRequest r) {
        List<CountResultLine> lines = new ArrayList<>();
        List<StockDtos.CountItem> sorted = new ArrayList<>(r.items());
        sorted.sort((a, b) -> a.productId().toString().compareTo(b.productId().toString()));
        for (var item : sorted) {
            Product p = productRepository.findByIdForUpdate(item.productId())
                    .orElseThrow(() -> NotFoundException.of("Product", item.productId()));
            BigDecimal system = p.getStockOnHand();
            BigDecimal diff = item.countedQuantity().subtract(system);
            boolean posted = diff.signum() != 0;
            if (posted) {
                // Counted quantity is the truth: allow the adjustment even under a no-negative policy.
                stockService.post(StockPost.adjust(p.getId(), MovementReason.PHYSICAL_COUNT, diff,
                        r.notes() == null ? "Physical count" : r.notes()), true);
            }
            lines.add(new CountResultLine(p.getId(), p.getSku(), p.getName(), system, item.countedQuantity(), diff, posted));
        }
        long changed = lines.stream().filter(CountResultLine::posted).count();
        auditService.record(AuditAction.STOCK_POST, "STOCK", null,
                "Physical count — " + lines.size() + " counted, " + changed + " adjusted");
        return lines;
    }

    @Transactional(readOnly = true)
    public PageResponse<MovementResponse> search(UUID productId, MovementType type, MovementReason reason,
                                                 Instant from, Instant to, String q, int page, int size) {
        var pageable = Pageables.of(page, size, null, Set.of("createdAt"), "createdAt", Sort.Direction.DESC);
        String term = q == null || q.isBlank() ? null : q.trim();
        return PageResponse.of(movementRepository.search(productId, type, reason, TimeRange.from(from), TimeRange.to(to), term, pageable),
                MovementResponse::from);
    }

    /** Products whose cached balance differs from SUM(ledger). Should always be empty. */
    @Transactional(readOnly = true)
    public List<ReconciliationLine> reconciliation() {
        return jdbc.query("""
                SELECT v.product_id, p.sku, p.name, v.ledger_quantity, v.cached_quantity
                  FROM v_product_stock v JOIN products p ON p.id = v.product_id
                 WHERE v.ledger_quantity <> v.cached_quantity
                """, (rs, i) -> new ReconciliationLine(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                rs.getBigDecimal(4), rs.getBigDecimal(5)));
    }
}
