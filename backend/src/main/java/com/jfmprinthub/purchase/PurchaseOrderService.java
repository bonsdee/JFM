package com.jfmprinthub.purchase;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.purchase.PurchaseDtos.POItemRequest;
import com.jfmprinthub.purchase.PurchaseDtos.POItemResponse;
import com.jfmprinthub.purchase.PurchaseDtos.PORequest;
import com.jfmprinthub.purchase.PurchaseDtos.POResponse;
import com.jfmprinthub.purchase.PurchaseDtos.POSummary;
import com.jfmprinthub.purchase.PurchaseDtos.PurchaseHistorySummary;
import com.jfmprinthub.purchase.PurchaseDtos.ReceiveLine;
import com.jfmprinthub.purchase.PurchaseDtos.ReceiveRequest;
import com.jfmprinthub.purchase.PurchaseDtos.ReorderSuggestion;
import com.jfmprinthub.purchase.PurchaseDtos.SuggestionCreateRequest;
import com.jfmprinthub.purchase.PurchaseDtos.SuggestionGroup;
import com.jfmprinthub.purchase.PurchaseDtos.SupplierPaymentRequest;
import com.jfmprinthub.purchase.PurchaseDtos.SupplierPaymentResponse;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockPost;
import com.jfmprinthub.stock.StockService;
import com.jfmprinthub.supplier.Supplier;
import com.jfmprinthub.supplier.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Purchase order lifecycle: DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED (or CANCELLED).
 * Receiving posts PURCHASE_RECEIVED stock-in movements (which update weighted average cost) atomically.
 */
@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository repository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final DocumentNumberService numbers;
    private final AuditService auditService;

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<POSummary> search(Collection<PurchaseOrder.Status> statuses, UUID supplierId, LocalDate from,
                                          LocalDate to, boolean unpaidOnly, String q, int page, int size, String sort) {
        Collection<PurchaseOrder.Status> st = statuses == null || statuses.isEmpty() ? EnumSet.allOf(PurchaseOrder.Status.class) : statuses;
        var pageable = Pageables.of(page, size, sort, Set.of("createdAt", "orderDate", "totalAmount", "poNumber"), "createdAt", Sort.Direction.DESC);
        return PageResponse.of(repository.search(st, supplierId, from, to, unpaidOnly, blank(q), pageable), this::toSummary);
    }

    /** Totals for the purchase/restock history header (same filters as the list). */
    @Transactional(readOnly = true)
    public PurchaseHistorySummary historySummary(Collection<PurchaseOrder.Status> statuses, UUID supplierId,
                                                 LocalDate from, LocalDate to) {
        Collection<PurchaseOrder.Status> st = statuses == null || statuses.isEmpty()
                ? EnumSet.complementOf(EnumSet.of(PurchaseOrder.Status.CANCELLED)) : statuses;
        var all = repository.search(st, supplierId, from, to, false, null,
                org.springframework.data.domain.PageRequest.of(0, 10_000)).getContent();
        BigDecimal ordered = all.stream().map(PurchaseOrder::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal received = all.stream().map(PurchaseOrder::receivedValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = all.stream().map(PurchaseOrder::getAmountPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal payables = all.stream().filter(p -> p.getStatus() != PurchaseOrder.Status.DRAFT)
                .map(PurchaseOrder::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PurchaseHistorySummary(all.size(), Money.of(ordered), Money.of(received), Money.of(paid), Money.of(payables));
    }

    @Transactional(readOnly = true)
    public PurchaseOrder entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Purchase order", id));
    }

    @Transactional(readOnly = true)
    public POResponse get(UUID id) {
        return toResponse(entity(id));
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public POResponse create(PORequest r) {
        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber(numbers.nextPoNumber());
        po.setStatus(PurchaseOrder.Status.DRAFT);
        apply(po, r);
        repository.save(po);
        auditService.record(AuditAction.CREATE, "PURCHASE_ORDER", po.getId(),
                "Created " + po.getPoNumber() + " for " + po.getSupplier().getName() + " — ₱" + po.getTotalAmount().toPlainString());
        return toResponse(po);
    }

    @Transactional
    public POResponse update(UUID id, PORequest r) {
        PurchaseOrder po = lock(id);
        if (po.getStatus() != PurchaseOrder.Status.DRAFT && po.getStatus() != PurchaseOrder.Status.ORDERED) {
            throw new BusinessException("PO_LOCKED", "Only draft or ordered POs can be edited");
        }
        if (po.getItems().stream().anyMatch(i -> i.getQtyReceived().signum() > 0)) {
            throw new BusinessException("PO_LOCKED", "PO already has received items");
        }
        apply(po, r);
        auditService.record(AuditAction.UPDATE, "PURCHASE_ORDER", id, "Updated " + po.getPoNumber());
        return toResponse(po);
    }

    @Transactional
    public POResponse markOrdered(UUID id) {
        PurchaseOrder po = lock(id);
        if (po.getStatus() != PurchaseOrder.Status.DRAFT) throw new BusinessException("INVALID_TRANSITION", "Only drafts can be marked as ordered");
        po.setStatus(PurchaseOrder.Status.ORDERED);
        po.setOrderedAt(Instant.now());
        if (po.getOrderDate() == null) po.setOrderDate(BusinessTime.today());
        auditService.record(AuditAction.STATUS_CHANGE, "PURCHASE_ORDER", id, po.getPoNumber() + " marked ORDERED");
        return toResponse(po);
    }

    /** Receive full or partial quantities. Each received line becomes a stock IN movement. */
    @Transactional
    public POResponse receive(UUID id, ReceiveRequest r) {
        PurchaseOrder po = lock(id);
        if (po.getStatus() == PurchaseOrder.Status.CANCELLED || po.getStatus() == PurchaseOrder.Status.RECEIVED) {
            throw new BusinessException("INVALID_TRANSITION", "Cannot receive a " + po.getStatus() + " purchase order");
        }
        Map<UUID, PurchaseOrderItem> byId = new HashMap<>();
        po.getItems().forEach(i -> byId.put(i.getId(), i));

        List<StockPost> posts = new ArrayList<>();
        for (ReceiveLine line : r.lines()) {
            if (line.quantity().signum() == 0) continue;
            PurchaseOrderItem item = byId.get(line.itemId());
            if (item == null) throw new NotFoundException("PO line not found: " + line.itemId());
            BigDecimal qty = Money.qty(line.quantity());
            if (qty.compareTo(item.remaining()) > 0) {
                throw new BusinessException("OVER_RECEIPT", "Receiving " + qty.stripTrailingZeros().toPlainString() + " of "
                        + item.getProduct().getName() + " exceeds the remaining " + item.remaining().stripTrailingZeros().toPlainString());
            }
            if (line.unitCost() != null) item.setUnitCost(Money.of(line.unitCost())); // actual invoice cost
            item.setQtyReceived(item.getQtyReceived().add(qty));
            posts.add(StockPost.in(item.getProduct().getId(), MovementReason.PURCHASE_RECEIVED, qty, item.getUnitCost(),
                    "PURCHASE_ORDER", po.getId(), po.getPoNumber(), r.notes()));
        }
        if (posts.isEmpty()) throw new BusinessException("NOTHING_TO_RECEIVE", "Enter at least one quantity to receive");
        stockService.postAll(posts);

        boolean complete = po.getItems().stream().allMatch(i -> i.remaining().signum() == 0);
        po.setStatus(complete ? PurchaseOrder.Status.RECEIVED : PurchaseOrder.Status.PARTIALLY_RECEIVED);
        if (po.getOrderedAt() == null) po.setOrderedAt(Instant.now());
        if (complete) po.setReceivedAt(Instant.now());
        recalcTotal(po);
        auditService.record(AuditAction.RECEIVE, "PURCHASE_ORDER", id,
                "Received " + posts.size() + " line(s) on " + po.getPoNumber() + " → " + po.getStatus());
        return toResponse(po);
    }

    /**
     * Cancel. For a partially received PO this closes it: received goods stay in stock and the total is
     * reduced to the received value so payables stay accurate.
     */
    @Transactional
    public POResponse cancel(UUID id) {
        PurchaseOrder po = lock(id);
        if (po.getStatus() == PurchaseOrder.Status.RECEIVED || po.getStatus() == PurchaseOrder.Status.CANCELLED) {
            throw new BusinessException("INVALID_TRANSITION", "Cannot cancel a " + po.getStatus() + " purchase order");
        }
        if (po.getStatus() == PurchaseOrder.Status.PARTIALLY_RECEIVED) {
            po.getItems().forEach(i -> i.setQtyOrdered(i.getQtyReceived().signum() > 0 ? i.getQtyReceived() : i.getQtyOrdered()));
            po.getItems().removeIf(i -> i.getQtyReceived().signum() == 0);
            po.setStatus(PurchaseOrder.Status.RECEIVED);
            po.setReceivedAt(Instant.now());
            recalcTotal(po);
            auditService.record(AuditAction.STATUS_CHANGE, "PURCHASE_ORDER", id, po.getPoNumber() + " closed short (remaining cancelled)");
        } else {
            po.setStatus(PurchaseOrder.Status.CANCELLED);
            po.setCancelledAt(Instant.now());
            auditService.record(AuditAction.STATUS_CHANGE, "PURCHASE_ORDER", id, po.getPoNumber() + " cancelled");
        }
        return toResponse(po);
    }

    @Transactional
    public POResponse addPayment(UUID id, SupplierPaymentRequest r) {
        PurchaseOrder po = lock(id);
        if (po.getStatus() == PurchaseOrder.Status.CANCELLED) throw new BusinessException("PO_CANCELLED", "PO is cancelled");
        BigDecimal amount = Money.of(r.amount());
        if (amount.compareTo(po.balance()) > 0) {
            throw new BusinessException("OVERPAYMENT", "Payment exceeds the balance of ₱" + po.balance().toPlainString());
        }
        SupplierPayment p = new SupplierPayment();
        p.setPurchaseOrder(po);
        p.setAmount(amount);
        p.setMethod(r.method());
        p.setReferenceNo(r.referenceNo());
        p.setNotes(r.notes());
        p.setPaidAt(r.paidAt() == null ? Instant.now() : r.paidAt());
        po.getPayments().add(p);
        po.setAmountPaid(po.getAmountPaid().add(amount));
        auditService.record(AuditAction.PAYMENT, "PURCHASE_ORDER", id,
                "Paid ₱" + amount.toPlainString() + " (" + r.method() + ") on " + po.getPoNumber());
        return toResponse(po);
    }

    // ------------------------------------------------------------------ reorder suggestions

    /** Items at/below reorder level, net of quantities already on open POs, grouped by supplier. */
    @Transactional(readOnly = true)
    public List<SuggestionGroup> suggestions() {
        Map<UUID, BigDecimal> onOrder = new HashMap<>();
        for (Object[] row : repository.openQuantities()) onOrder.put((UUID) row[0], (BigDecimal) row[1]);

        Map<String, List<ReorderSuggestion>> groups = new LinkedHashMap<>();
        Map<String, Supplier> suppliers = new HashMap<>();
        for (Product p : productRepository.findLowStock()) {
            BigDecimal pending = onOrder.getOrDefault(p.getId(), BigDecimal.ZERO);
            // Target = 2 × reorder level (simple min/max policy).
            BigDecimal target = p.getReorderLevel().multiply(BigDecimal.valueOf(2)).max(BigDecimal.ONE);
            BigDecimal suggested = target.subtract(p.getStockOnHand()).subtract(pending);
            if (suggested.signum() <= 0) continue;
            suggested = suggested.setScale(0, java.math.RoundingMode.CEILING);
            Supplier s = p.getSupplier();
            String key = s == null ? "none" : s.getId().toString();
            if (s != null) suppliers.put(key, s);
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(new ReorderSuggestion(p.getId(), p.getSku(), p.getName(),
                    p.getUnit().name(), p.getStockOnHand(), p.getReorderLevel(), pending, suggested, p.getCostPrice(),
                    s == null ? null : s.getId(), s == null ? null : s.getName()));
        }
        return groups.entrySet().stream().map(e -> {
            Supplier s = suppliers.get(e.getKey());
            BigDecimal est = e.getValue().stream().map(x -> x.suggestedQty().multiply(x.lastCost())).reduce(BigDecimal.ZERO, BigDecimal::add);
            return new SuggestionGroup(s == null ? null : s.getId(), s == null ? "No supplier assigned" : s.getName(),
                    e.getValue(), Money.of(est));
        }).toList();
    }

    /** One click: create one DRAFT PO per supplier from selected suggestion lines. */
    @Transactional
    public List<POResponse> createFromSuggestions(SuggestionCreateRequest r) {
        Map<UUID, List<POItemRequest>> bySupplier = new LinkedHashMap<>();
        for (var line : r.items()) {
            Product p = productRepository.findById(line.productId()).orElseThrow(() -> NotFoundException.of("Product", line.productId()));
            UUID supplierId = line.supplierId() != null ? line.supplierId() : p.getSupplier() != null ? p.getSupplier().getId() : null;
            if (supplierId == null) throw new BusinessException("SUPPLIER_REQUIRED", p.getName() + " has no supplier — choose one");
            bySupplier.computeIfAbsent(supplierId, k -> new ArrayList<>()).add(new POItemRequest(p.getId(), line.quantity(),
                    line.unitCost() != null ? line.unitCost() : p.getCostPrice()));
        }
        List<POResponse> created = new ArrayList<>();
        bySupplier.forEach((supplierId, items) ->
                created.add(create(new PORequest(supplierId, BusinessTime.today(), null, "Auto-created from reorder suggestions", items))));
        return created;
    }

    // ------------------------------------------------------------------ internals

    private PurchaseOrder lock(UUID id) {
        return repository.findByIdForUpdate(id).orElseThrow(() -> NotFoundException.of("Purchase order", id));
    }

    private void apply(PurchaseOrder po, PORequest r) {
        po.setSupplier(supplierRepository.findById(r.supplierId()).orElseThrow(() -> NotFoundException.of("Supplier", r.supplierId())));
        po.setOrderDate(r.orderDate() == null ? BusinessTime.today() : r.orderDate());
        po.setExpectedDate(r.expectedDate());
        po.setNotes(r.notes());
        po.getItems().clear();
        for (POItemRequest i : r.items()) {
            Product p = productRepository.findById(i.productId()).orElseThrow(() -> NotFoundException.of("Product", i.productId()));
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(po);
            item.setProduct(p);
            item.setQtyOrdered(Money.qty(i.qtyOrdered()));
            item.setUnitCost(Money.of(i.unitCost()));
            po.getItems().add(item);
        }
        recalcTotal(po);
        if (po.getAmountPaid().compareTo(po.getTotalAmount()) > 0) {
            throw new BusinessException("OVERPAID", "New total is lower than the amount already paid");
        }
    }

    private void recalcTotal(PurchaseOrder po) {
        po.setTotalAmount(Money.of(po.getItems().stream().map(PurchaseOrderItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)));
    }

    private POSummary toSummary(PurchaseOrder po) {
        return new POSummary(po.getId(), po.getPoNumber(), po.getSupplier().getId(), po.getSupplier().getName(), po.getStatus(),
                po.getOrderDate(), po.getExpectedDate(), po.getItems().size(), po.getTotalAmount(), po.getAmountPaid(),
                po.balance(), po.getCreatedAt());
    }

    public POResponse toResponse(PurchaseOrder po) {
        Supplier s = po.getSupplier();
        List<POItemResponse> items = po.getItems().stream().map(i -> new POItemResponse(i.getId(), i.getProduct().getId(),
                i.getProduct().getSku(), i.getProduct().getName(), i.getProduct().getUnit().name(), i.getQtyOrdered(),
                i.getQtyReceived(), i.remaining(), i.getUnitCost(), Money.of(i.lineTotal()))).toList();
        List<SupplierPaymentResponse> payments = po.getPayments().stream().map(p -> new SupplierPaymentResponse(p.getId(),
                p.getAmount(), p.getMethod(), p.getReferenceNo(), p.getNotes(), p.getPaidAt())).toList();
        return new POResponse(po.getId(), po.getPoNumber(), s.getId(), s.getName(), s.getPhone(), s.getEmail(), po.getStatus(),
                po.getOrderDate(), po.getExpectedDate(), po.getNotes(), po.getTotalAmount(), Money.of(po.receivedValue()),
                po.getAmountPaid(), po.balance(), po.getOrderedAt(), po.getReceivedAt(), po.getCancelledAt(), items, payments,
                po.getCreatedAt());
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
