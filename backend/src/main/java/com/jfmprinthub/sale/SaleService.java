package com.jfmprinthub.sale;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.TimeRange;
import com.jfmprinthub.common.PaymentMethod;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.customer.Customer;
import com.jfmprinthub.customer.CustomerRepository;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.sale.SaleDtos.CartLine;
import com.jfmprinthub.sale.SaleDtos.CheckoutRequest;
import com.jfmprinthub.sale.SaleDtos.PaymentResponse;
import com.jfmprinthub.sale.SaleDtos.SaleItemResponse;
import com.jfmprinthub.sale.SaleDtos.SaleResponse;
import com.jfmprinthub.sale.SaleDtos.SaleSummary;
import com.jfmprinthub.service.CatalogService;
import com.jfmprinthub.service.PricingDtos.QuoteResult;
import com.jfmprinthub.service.PricingService;
import com.jfmprinthub.settings.BusinessSettings;
import com.jfmprinthub.settings.SettingsService;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockMovement;
import com.jfmprinthub.stock.StockMovementRepository;
import com.jfmprinthub.stock.StockPost;
import com.jfmprinthub.stock.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * POS checkout, voids and sales history.
 * A checkout is ONE transaction: sale + lines + payment + every stock OUT movement (products and service
 * materials). Any failure (e.g. insufficient stock) rolls everything back.
 */
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository repository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final StockMovementRepository movementRepository;
    private final StockService stockService;
    private final PricingService pricingService;
    private final SettingsService settingsService;
    private final DocumentNumberService numbers;
    private final AuditService auditService;
    private final ApplicationEventPublisher events;

    /** Draft line used while building a sale, holding its stock postings. */
    private record DraftLine(SaleItem item, List<StockPost> posts) {}

    @Transactional
    public SaleResponse checkout(CheckoutRequest r) {
        Sale sale = new Sale();
        sale.setSaleNumber(numbers.nextSaleNumber());
        sale.setSoldAt(Instant.now());
        sale.setSource(Sale.Source.POS);
        sale.setCustomer(customer(r.customerId()));
        sale.setNotes(r.notes());
        repository.saveAndFlush(sale); // obtain id for movement references

        List<DraftLine> drafts = new ArrayList<>();
        for (CartLine line : r.items()) {
            drafts.add(switch (line.type()) {
                case PRODUCT -> productLine(sale, line);
                case SERVICE -> serviceLine(sale, line);
            });
        }

        // Lock every product touched by this sale up-front (sorted), then post per line.
        stockService.lockAll(drafts.stream().flatMap(d -> d.posts().stream()).map(StockPost::productId).toList());
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal costTotal = BigDecimal.ZERO;
        for (DraftLine d : drafts) {
            List<StockMovement> moved = d.posts().isEmpty() ? List.of() : stockService.postAll(d.posts());
            BigDecimal cost = moved.stream()
                    .map(m -> m.getQuantity().abs().multiply(Money.nz(m.getUnitCost())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            SaleItem item = d.item();
            item.setCostTotal(Money.of(cost));
            item.setUnitCost(Money.of(cost.divide(item.getQuantity(), 6, RoundingMode.HALF_UP)));
            sale.addItem(item);
            subtotal = subtotal.add(item.getLineTotal());
            costTotal = costTotal.add(item.getCostTotal());
        }

        applyTotals(sale, subtotal, r.discountType(), r.discountValue());
        sale.setCostTotal(Money.of(costTotal));

        BigDecimal tendered = r.paymentMethod() == PaymentMethod.CASH
                ? Money.of(r.amountTendered() == null ? sale.getTotal() : r.amountTendered())
                : sale.getTotal();
        if (tendered.compareTo(sale.getTotal()) < 0) {
            throw new BusinessException("INSUFFICIENT_PAYMENT", "Amount tendered is less than the total due");
        }
        sale.setAmountTendered(tendered);
        sale.setChangeDue(tendered.subtract(sale.getTotal()));
        repository.save(sale);

        if (sale.getTotal().signum() > 0) {
            Payment p = new Payment();
            p.setSaleId(sale.getId());
            p.setMethod(r.paymentMethod());
            p.setAmount(sale.getTotal());
            p.setReferenceNo(r.referenceNo());
            p.setPaidAt(sale.getSoldAt());
            paymentRepository.save(p);
        }

        auditService.record(AuditAction.CREATE, "SALE", sale.getId(),
                "Sale " + sale.getSaleNumber() + " — ₱" + sale.getTotal().toPlainString(),
                Map.of("items", sale.getItems().size(), "method", r.paymentMethod().name()));
        return toResponse(sale);
    }

    private DraftLine productLine(Sale sale, CartLine line) {
        if (line.productId() == null) throw new BusinessException("PRODUCT_REQUIRED", "Product line is missing productId");
        Product p = productRepository.findById(line.productId()).orElseThrow(() -> NotFoundException.of("Product", line.productId()));
        if (p.isArchived()) throw new BusinessException("PRODUCT_ARCHIVED", p.getName() + " is archived");
        BigDecimal qty = Money.qty(line.quantity() == null ? BigDecimal.ONE : line.quantity());
        BigDecimal price = Money.of(line.unitPrice() != null ? line.unitPrice() : p.getSellingPrice());
        SaleItem item = new SaleItem();
        item.setLineType(SaleItem.LineType.PRODUCT);
        item.setProduct(p);
        item.setDescription(p.getName());
        item.setQuantity(qty);
        item.setUnitPrice(price);
        item.setLineTotal(Money.of(price.multiply(qty)));
        return new DraftLine(item, List.of(StockPost.out(p.getId(), MovementReason.SALE, qty, "SALE",
                sale.getId(), sale.getSaleNumber(), null)));
    }

    private DraftLine serviceLine(Sale sale, CartLine line) {
        if (line.quote() == null) throw new BusinessException("QUOTE_REQUIRED", "Service line is missing its specs");
        CatalogService svc = pricingService.resolve(line.quote());
        QuoteResult q = pricingService.calculate(svc, line.quote());
        SaleItem item = new SaleItem();
        item.setLineType(SaleItem.LineType.SERVICE);
        item.setService(svc);
        item.setDescription(q.description());
        item.setSpecs(q.specs());
        item.setQuantity(Money.qty(q.quantity()));
        item.setUnitPrice(q.unitPrice());
        item.setLineTotal(q.total());
        return new DraftLine(item, pricingService.consumptionPosts(svc, q.billableUnits(), MovementReason.SALE,
                "SALE", sale.getId(), sale.getSaleNumber()));
    }

    /** Discount, then VAT (inclusive: carved out of the total; exclusive: added on top). */
    void applyTotals(Sale sale, BigDecimal subtotal, Sale.DiscountType type, BigDecimal value) {
        subtotal = Money.of(subtotal);
        BigDecimal discount = BigDecimal.ZERO;
        if (type != null && Money.isPositive(value)) {
            discount = type == Sale.DiscountType.PERCENT ? Money.percentOf(subtotal, value.min(Money.HUNDRED)) : Money.of(value);
            discount = discount.min(subtotal);
        }
        BigDecimal net = subtotal.subtract(discount);
        BusinessSettings settings = settingsService.entity();
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal total = net;
        if (settings.isVatEnabled() && Money.isPositive(settings.getVatRate())) {
            BigDecimal rate = settings.getVatRate();
            if (settings.isVatInclusive()) {
                tax = Money.of(net.multiply(rate).divide(Money.HUNDRED.add(rate), 6, RoundingMode.HALF_UP));
            } else {
                tax = Money.percentOf(net, rate);
                total = net.add(tax);
            }
        }
        sale.setSubtotal(subtotal);
        sale.setDiscountType(type);
        sale.setDiscountValue(Money.of(value));
        sale.setDiscountAmount(discount);
        sale.setTaxAmount(tax);
        sale.setTotal(Money.of(total));
    }

    /**
     * Creates the revenue record for a claimed job order. Materials were already consumed when the job was
     * printed, so no stock is posted here; line costs come from the job's recorded material cost.
     */
    @Transactional
    public Sale createFromJob(UUID jobOrderId, String jobNumber, Customer customer, List<SaleItem> lines,
                              BigDecimal discount, String notes) {
        Sale sale = new Sale();
        sale.setSaleNumber(numbers.nextSaleNumber());
        sale.setSource(Sale.Source.JOB_ORDER);
        sale.setJobOrderId(jobOrderId);
        sale.setCustomer(customer);
        sale.setSoldAt(Instant.now());
        sale.setNotes(notes != null ? notes : "Claimed job order " + jobNumber);
        BigDecimal subtotal = BigDecimal.ZERO, cost = BigDecimal.ZERO;
        for (SaleItem i : lines) {
            sale.addItem(i);
            subtotal = subtotal.add(i.getLineTotal());
            cost = cost.add(i.getCostTotal());
        }
        applyTotals(sale, subtotal, Money.isPositive(discount) ? Sale.DiscountType.AMOUNT : null, discount);
        sale.setCostTotal(Money.of(cost));
        sale.setAmountTendered(sale.getTotal());
        repository.save(sale);
        auditService.record(AuditAction.CREATE, "SALE", sale.getId(),
                "Sale " + sale.getSaleNumber() + " from job " + jobNumber + " — ₱" + sale.getTotal().toPlainString());
        return sale;
    }

    /** Voids a sale and reverses every stock movement it produced. */
    @Transactional
    public SaleResponse voidSale(UUID id, String reason) {
        Sale sale = entity(id);
        if (sale.getStatus() == Sale.Status.VOIDED) throw BusinessException.conflict("ALREADY_VOIDED", "Sale is already voided");

        List<StockMovement> original = movementRepository.findByReferenceTypeAndReferenceId("SALE", id);
        List<StockPost> reversals = original.stream()
                .filter(m -> m.getQuantity().signum() < 0)
                .map(m -> StockPost.in(m.getProduct().getId(), MovementReason.SALE_VOID, m.getQuantity().abs(),
                        m.getUnitCost(), "SALE_VOID", id, sale.getSaleNumber(), "Void: " + reason))
                .toList();
        if (!reversals.isEmpty()) stockService.postAll(reversals);

        for (Payment p : paymentRepository.findBySaleIdOrderByPaidAtAsc(id)) {
            if (sale.getSource() == Sale.Source.JOB_ORDER && p.getJobOrderId() != null) {
                p.setSaleId(null); // payment still belongs to the (reopened) job order
            } else {
                p.setVoided(true);
            }
        }
        sale.setStatus(Sale.Status.VOIDED);
        sale.setVoidedAt(Instant.now());
        sale.setVoidReason(reason);
        events.publishEvent(new SaleVoidedEvent(id, sale.getJobOrderId(), reason));
        auditService.record(AuditAction.VOID, "SALE", id, "Voided sale " + sale.getSaleNumber() + ": " + reason,
                Map.of("reversedMovements", reversals.size(), "total", sale.getTotal()));
        return toResponse(sale);
    }

    @Transactional(readOnly = true)
    public Sale entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Sale", id));
    }

    @Transactional(readOnly = true)
    public SaleResponse get(UUID id) {
        return toResponse(entity(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<SaleSummary> search(Sale.Status status, Sale.Source source, UUID customerId, Instant from,
                                            Instant to, String q, int page, int size, String sort) {
        var pageable = Pageables.of(page, size, sort, Set.of("soldAt", "total", "saleNumber"), "soldAt", Sort.Direction.DESC);
        var result = repository.search(status, source, customerId, TimeRange.from(from), TimeRange.to(to), q == null || q.isBlank() ? null : q.trim(), pageable);
        Map<UUID, String> methods = paymentMethods(result.getContent().stream().map(Sale::getId).toList());
        return PageResponse.of(result, s -> new SaleSummary(s.getId(), s.getSaleNumber(), s.getSource(), s.getStatus(),
                s.getCustomer() != null ? s.getCustomer().getId() : null,
                s.getCustomer() != null ? s.getCustomer().getName() : "Walk-in",
                s.getTotal(), s.getTotal().subtract(s.getCostTotal()), s.getItems().size(),
                methods.getOrDefault(s.getId(), ""), s.getSoldAt()));
    }

    private Map<UUID, String> paymentMethods(List<UUID> saleIds) {
        Map<UUID, String> map = new LinkedHashMap<>();
        if (saleIds.isEmpty()) return map;
        paymentRepository.findBySaleIdIn(saleIds).stream()
                .collect(Collectors.groupingBy(Payment::getSaleId,
                        Collectors.mapping(p -> p.getMethod().name(), Collectors.toCollection(java.util.TreeSet::new))))
                .forEach((id, set) -> map.put(id, String.join(", ", set)));
        return map;
    }

    public SaleResponse toResponse(Sale s) {
        List<SaleItemResponse> items = s.getItems().stream().map(i -> new SaleItemResponse(i.getId(), i.getLineType(),
                i.getProduct() != null ? i.getProduct().getId() : null,
                i.getService() != null ? i.getService().getId() : null,
                i.getDescription(), i.getSpecs(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal(),
                i.getUnitCost(), i.getCostTotal())).toList();
        List<PaymentResponse> payments = s.getId() == null ? List.of()
                : paymentRepository.findBySaleIdOrderByPaidAtAsc(s.getId()).stream().map(PaymentResponse::from).toList();
        return new SaleResponse(s.getId(), s.getSaleNumber(), s.getSource(), s.getStatus(),
                s.getCustomer() != null ? s.getCustomer().getId() : null,
                s.getCustomer() != null ? s.getCustomer().getName() : "Walk-in",
                s.getJobOrderId(), s.getSubtotal(), s.getDiscountType(), s.getDiscountValue(), s.getDiscountAmount(),
                s.getTaxAmount(), s.getTotal(), s.getCostTotal(), s.getTotal().subtract(s.getCostTotal()),
                s.getAmountTendered(), s.getChangeDue(), s.getNotes(), s.getSoldAt(), s.getVoidedAt(),
                s.getVoidReason(), items, payments);
    }

    private Customer customer(UUID id) {
        return id == null ? null : customerRepository.findById(id).orElseThrow(() -> NotFoundException.of("Customer", id));
    }
}
