package com.jfmprinthub.joborder;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.TimeRange;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.customer.Customer;
import com.jfmprinthub.customer.CustomerRepository;
import com.jfmprinthub.joborder.JobOrderDtos.ClaimRequest;
import com.jfmprinthub.joborder.JobOrderDtos.FileAttachRequest;
import com.jfmprinthub.joborder.JobOrderDtos.JobFileResponse;
import com.jfmprinthub.joborder.JobOrderDtos.JobItemRequest;
import com.jfmprinthub.joborder.JobOrderDtos.JobItemResponse;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderRequest;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderResponse;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderSummary;
import com.jfmprinthub.joborder.JobOrderDtos.PaymentRequest;
import com.jfmprinthub.joborder.JobOrderDtos.StatusChangeRequest;
import com.jfmprinthub.sale.Payment;
import com.jfmprinthub.sale.PaymentRepository;
import com.jfmprinthub.sale.Sale;
import com.jfmprinthub.sale.SaleDtos.PaymentResponse;
import com.jfmprinthub.sale.SaleItem;
import com.jfmprinthub.sale.SaleService;
import com.jfmprinthub.sale.SaleVoidedEvent;
import com.jfmprinthub.service.CatalogService;
import com.jfmprinthub.service.PricingDtos.QuoteResult;
import com.jfmprinthub.service.PricingService;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockMovement;
import com.jfmprinthub.stock.StockPost;
import com.jfmprinthub.stock.StockService;
import com.jfmprinthub.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Job order lifecycle: create (priced by {@link PricingService}), move through the Kanban pipeline,
 * consume BOM materials when printed, collect payments, claim (creates a Sale) or cancel.
 */
@Service
@RequiredArgsConstructor
public class JobOrderService {

    private final JobOrderRepository repository;
    private final CustomerRepository customerRepository;
    private final PaymentRepository paymentRepository;
    private final PricingService pricingService;
    private final StockService stockService;
    private final SaleService saleService;
    private final StorageService storageService;
    private final DocumentNumberService numbers;
    private final AuditService auditService;

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<JobOrderSummary> search(Collection<JobStatus> statuses, UUID customerId, Instant from,
                                                Instant to, boolean overdue, String q, int page, int size, String sort) {
        Collection<JobStatus> st = statuses == null || statuses.isEmpty() ? EnumSet.allOf(JobStatus.class) : statuses;
        var pageable = Pageables.of(page, size, sort, Set.of("createdAt", "dueAt", "total", "jobNumber"), "createdAt", Sort.Direction.DESC);
        return PageResponse.of(repository.search(st, customerId, TimeRange.from(from), TimeRange.to(to), overdue, Instant.now(), blank(q), pageable), this::toSummary);
    }

    /** Kanban columns: all open jobs plus those closed in the last 3 days. */
    @Transactional(readOnly = true)
    public Map<JobStatus, List<JobOrderSummary>> board() {
        Map<JobStatus, List<JobOrderSummary>> board = new java.util.LinkedHashMap<>();
        for (JobStatus s : JobStatus.values()) board.put(s, new ArrayList<>());
        repository.findBoard(Instant.now().minus(Duration.ofDays(3)))
                .forEach(j -> board.get(j.getStatus()).add(toSummary(j)));
        return board;
    }

    @Transactional(readOnly = true)
    public JobOrder entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Job order", id));
    }

    @Transactional(readOnly = true)
    public JobOrderResponse get(UUID id) {
        return toResponse(entity(id), true);
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public JobOrderResponse create(JobOrderRequest r) {
        JobOrder job = new JobOrder();
        job.setJobNumber(numbers.nextJobNumber());
        applyHeader(job, r);
        replaceItems(job, r.items());
        recalc(job, r.discountAmount());
        repository.saveAndFlush(job);
        if (r.downpayment() != null) addPaymentInternal(job, r.downpayment(), "Downpayment");
        auditService.record(AuditAction.CREATE, "JOB_ORDER", job.getId(),
                "Created job " + job.getJobNumber() + " for " + job.displayCustomer() + " — ₱" + job.getTotal().toPlainString());
        return toResponse(job, true);
    }

    @Transactional
    public JobOrderResponse update(UUID id, JobOrderRequest r) {
        JobOrder job = lock(id);
        if (!JobStatus.EDITABLE.contains(job.getStatus())) {
            throw new BusinessException("JOB_LOCKED", "Job items can only be edited before printing starts");
        }
        applyHeader(job, r);
        replaceItems(job, r.items());
        recalc(job, r.discountAmount());
        if (job.getAmountPaid().compareTo(job.getTotal()) > 0) {
            throw new BusinessException("OVERPAID", "New total is lower than the amount already paid");
        }
        auditService.record(AuditAction.UPDATE, "JOB_ORDER", id, "Updated job " + job.getJobNumber());
        return toResponse(job, true);
    }

    /** Kanban drag/drop or status dropdown. Entering READY_FOR_PICKUP consumes materials. */
    @Transactional
    public JobOrderResponse changeStatus(UUID id, StatusChangeRequest r) {
        JobOrder job = lock(id);
        JobStatus from = job.getStatus();
        if (r.status() == JobStatus.CLAIMED) throw new BusinessException("USE_CLAIM", "Use the Claim action to release a job");
        if (r.status() == JobStatus.CANCELLED) return cancel(id, r.reason() == null ? "Cancelled from board" : r.reason());
        if (!from.canMoveTo(r.status())) {
            throw new BusinessException("INVALID_TRANSITION", "Cannot move job from " + from + " to " + r.status());
        }
        if (r.status() == JobStatus.READY_FOR_PICKUP) consumeMaterials(job);
        job.setStatus(r.status());
        if (r.position() != null) job.setBoardPosition(r.position());
        if (from != r.status()) {
            auditService.record(AuditAction.STATUS_CHANGE, "JOB_ORDER", id,
                    job.getJobNumber() + ": " + from + " → " + r.status());
        }
        return toResponse(job, false);
    }

    /** Explicit "Mark printed" action: consume BOM and move to READY_FOR_PICKUP. */
    @Transactional
    public JobOrderResponse markPrinted(UUID id) {
        return changeStatus(id, new StatusChangeRequest(JobStatus.READY_FOR_PICKUP, null, null));
    }

    @Transactional
    public JobOrderResponse addPayment(UUID id, PaymentRequest r) {
        JobOrder job = lock(id);
        if (!job.getStatus().isOpen()) throw new BusinessException("JOB_CLOSED", "Job is already " + job.getStatus());
        addPaymentInternal(job, r, r.notes());
        return toResponse(job, true);
    }

    /**
     * Release to customer: optional balance payment, full payment required, materials consumed if not yet,
     * then a JOB_ORDER sale is created and payments are linked to it.
     */
    @Transactional
    public JobOrderResponse claim(UUID id, ClaimRequest r) {
        JobOrder job = lock(id);
        if (!job.getStatus().isOpen()) throw new BusinessException("JOB_CLOSED", "Job is already " + job.getStatus());
        if (r != null && r.balancePayment() != null) addPaymentInternal(job, r.balancePayment(), "Balance payment");
        if (job.balance().signum() > 0) {
            throw new BusinessException("BALANCE_DUE", "Collect the remaining balance of ₱" + job.balance().toPlainString() + " before claiming");
        }
        consumeMaterials(job);

        List<SaleItem> lines = job.getItems().stream().map(i -> {
            SaleItem s = new SaleItem();
            s.setLineType(SaleItem.LineType.SERVICE);
            s.setService(i.getService());
            s.setDescription(i.getDescription());
            s.setSpecs(i.getSpecs());
            s.setQuantity(i.getQuantity());
            s.setUnitPrice(i.getUnitPrice());
            s.setLineTotal(i.getLineTotal());
            s.setCostTotal(Money.of(i.getMaterialCost()));
            s.setUnitCost(Money.of(i.getMaterialCost().divide(i.getQuantity(), 6, RoundingMode.HALF_UP)));
            return s;
        }).toList();
        Sale sale = saleService.createFromJob(job.getId(), job.getJobNumber(), job.getCustomer(), lines,
                job.getDiscountAmount(), null);
        for (Payment p : paymentRepository.findByJobOrderIdOrderByPaidAtAsc(job.getId())) {
            if (!p.isVoided()) p.setSaleId(sale.getId());
        }
        job.setSaleId(sale.getId());
        job.setStatus(JobStatus.CLAIMED);
        job.setClaimedAt(Instant.now());
        auditService.record(AuditAction.STATUS_CHANGE, "JOB_ORDER", id,
                "Claimed job " + job.getJobNumber() + " → sale " + sale.getSaleNumber());
        return toResponse(job, true);
    }

    @Transactional
    public JobOrderResponse cancel(UUID id, String reason) {
        JobOrder job = lock(id);
        if (!job.getStatus().isOpen()) throw new BusinessException("JOB_CLOSED", "Job is already " + job.getStatus());
        job.setStatus(JobStatus.CANCELLED);
        job.setCancelledAt(Instant.now());
        job.setCancelReason(reason);
        // Consumed materials are not returned: they were physically used.
        auditService.record(AuditAction.STATUS_CHANGE, "JOB_ORDER", id, "Cancelled job " + job.getJobNumber() + ": " + reason,
                Map.of("amountPaid", job.getAmountPaid(), "materialsConsumed", job.isMaterialsConsumed()));
        return toResponse(job, true);
    }

    /** When a claimed job's sale is voided, reopen the job so it can be corrected and claimed again. */
    @EventListener
    public void onSaleVoided(SaleVoidedEvent event) {
        if (event.jobOrderId() == null) return;
        repository.findByIdForUpdate(event.jobOrderId()).ifPresent(job -> {
            job.setStatus(JobStatus.READY_FOR_PICKUP);
            job.setSaleId(null);
            job.setClaimedAt(null);
            auditService.record(AuditAction.STATUS_CHANGE, "JOB_ORDER", job.getId(),
                    "Reopened job " + job.getJobNumber() + " (sale voided: " + event.reason() + ")");
        });
    }

    // ------------------------------------------------------------------ files

    @Transactional
    public JobFileResponse attachFile(UUID id, FileAttachRequest r) {
        JobOrder job = entity(id);
        JobOrderFile f = new JobOrderFile();
        f.setJobOrder(job);
        f.setBucket(storageService.buckets().jobFiles());
        f.setPath(r.path());
        f.setFileName(r.fileName());
        f.setContentType(r.contentType());
        f.setSizeBytes(r.sizeBytes());
        job.getFiles().add(f);
        repository.saveAndFlush(job);
        auditService.record(AuditAction.UPDATE, "JOB_ORDER", id, "Attached file " + r.fileName() + " to " + job.getJobNumber());
        return toFile(f, true);
    }

    @Transactional
    public void deleteFile(UUID id, UUID fileId) {
        JobOrder job = entity(id);
        JobOrderFile f = job.getFiles().stream().filter(x -> x.getId().equals(fileId)).findFirst()
                .orElseThrow(() -> NotFoundException.of("File", fileId));
        job.getFiles().remove(f);
        storageService.delete(f.getBucket(), f.getPath());
        auditService.record(AuditAction.DELETE, "JOB_ORDER", id, "Removed file " + f.getFileName() + " from " + job.getJobNumber());
    }

    // ------------------------------------------------------------------ internals

    private JobOrder lock(UUID id) {
        return repository.findByIdForUpdate(id).orElseThrow(() -> NotFoundException.of("Job order", id));
    }

    private void applyHeader(JobOrder job, JobOrderRequest r) {
        Customer c = r.customerId() == null ? null : customerRepository.findById(r.customerId())
                .orElseThrow(() -> NotFoundException.of("Customer", r.customerId()));
        job.setCustomer(c);
        job.setCustomerName(c != null ? c.getName() : blank(r.customerName()));
        job.setCustomerPhone(blank(r.customerPhone()) != null ? r.customerPhone() : c != null ? c.getPhone() : null);
        job.setDueAt(r.dueAt());
        job.setNotes(r.notes());
    }

    private void replaceItems(JobOrder job, List<JobItemRequest> items) {
        job.getItems().clear();
        for (JobItemRequest ir : items) {
            CatalogService svc = pricingService.resolve(ir.quote());
            QuoteResult q = pricingService.calculate(svc, ir.quote());
            JobOrderItem item = new JobOrderItem();
            item.setJobOrder(job);
            item.setService(svc);
            item.setDescription(blank(ir.description()) != null ? ir.description() : q.description());
            item.setSpecs(q.specs());
            item.setQuantity(Money.qty(q.quantity()));
            item.setUnitPrice(q.unitPrice());
            item.setLineTotal(q.total());
            item.setMaterialCost(BigDecimal.ZERO);
            job.getItems().add(item);
        }
    }

    private void recalc(JobOrder job, BigDecimal discount) {
        BigDecimal subtotal = job.getItems().stream().map(JobOrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal disc = Money.of(discount).min(subtotal);
        job.setSubtotal(Money.of(subtotal));
        job.setDiscountAmount(disc);
        job.setTotal(Money.of(subtotal.subtract(disc)));
    }

    private void addPaymentInternal(JobOrder job, PaymentRequest r, String notes) {
        BigDecimal amount = Money.of(r.amount());
        if (amount.compareTo(job.balance()) > 0) {
            throw new BusinessException("OVERPAYMENT", "Payment exceeds the remaining balance of ₱" + job.balance().toPlainString());
        }
        Payment p = new Payment();
        p.setJobOrderId(job.getId());
        p.setMethod(r.method());
        p.setAmount(amount);
        p.setReferenceNo(r.referenceNo());
        p.setNotes(notes);
        p.setPaidAt(Instant.now());
        paymentRepository.save(p);
        job.setAmountPaid(job.getAmountPaid().add(amount));
        auditService.record(AuditAction.PAYMENT, "JOB_ORDER", job.getId(),
                "Payment ₱" + amount.toPlainString() + " (" + r.method() + ") on " + job.getJobNumber());
    }

    /** Idempotently deducts BOM materials for every item, recording per-item material cost. */
    void consumeMaterials(JobOrder job) {
        if (job.isMaterialsConsumed()) return;
        List<StockPost> all = new ArrayList<>();
        List<Integer> counts = new ArrayList<>();
        for (JobOrderItem item : job.getItems()) {
            List<StockPost> posts = pricingService.consumptionPosts(item.getService(), billableUnits(item),
                    MovementReason.JOB_CONSUMPTION, "JOB_ORDER", job.getId(), job.getJobNumber());
            all.addAll(posts);
            counts.add(posts.size());
        }
        List<StockMovement> moved = all.isEmpty() ? List.of() : stockService.postAll(all);
        int idx = 0;
        for (int i = 0; i < job.getItems().size(); i++) {
            BigDecimal cost = BigDecimal.ZERO;
            for (int k = 0; k < counts.get(i); k++) {
                StockMovement m = moved.get(idx++);
                cost = cost.add(m.getQuantity().abs().multiply(Money.nz(m.getUnitCost())));
            }
            job.getItems().get(i).setMaterialCost(Money.of(cost));
        }
        job.setMaterialsConsumed(true);
        job.setPrintedAt(Instant.now());
    }

    static BigDecimal billableUnits(JobOrderItem item) {
        Object v = item.getSpecs() == null ? null : item.getSpecs().get("billableUnits");
        if (v == null) return item.getQuantity();
        return new BigDecimal(String.valueOf(v));
    }

    private JobOrderSummary toSummary(JobOrder j) {
        String items = j.getItems().stream().map(JobOrderItem::getDescription).collect(Collectors.joining("; "));
        if (items.length() > 120) items = items.substring(0, 117) + "...";
        return new JobOrderSummary(j.getId(), j.getJobNumber(), j.displayCustomer(), j.getCustomerPhone(), j.getStatus(),
                j.getDueAt(), j.isOverdue(), j.getTotal(), j.getAmountPaid(), j.balance(), items, j.getFiles().size(),
                j.getBoardPosition(), j.getCreatedAt());
    }

    private JobOrderResponse toResponse(JobOrder j, boolean withFileUrls) {
        List<JobItemResponse> items = j.getItems().stream().map(i -> new JobItemResponse(i.getId(), i.getService().getId(),
                i.getService().getName(), i.getDescription(), i.getSpecs(), i.getQuantity(), i.getUnitPrice(),
                i.getLineTotal(), i.getMaterialCost())).toList();
        List<JobFileResponse> files = j.getFiles().stream().map(f -> toFile(f, withFileUrls)).toList();
        List<PaymentResponse> payments = j.getId() == null ? List.of()
                : paymentRepository.findByJobOrderIdOrderByPaidAtAsc(j.getId()).stream().map(PaymentResponse::from).toList();
        return new JobOrderResponse(j.getId(), j.getJobNumber(), j.getCustomer() != null ? j.getCustomer().getId() : null,
                j.displayCustomer(), j.getCustomerPhone(), j.getStatus(), j.getDueAt(), j.isOverdue(), j.getNotes(),
                j.getSubtotal(), j.getDiscountAmount(), j.getTotal(), j.getAmountPaid(), j.balance(),
                j.isMaterialsConsumed(), j.getPrintedAt(), j.getClaimedAt(), j.getCancelledAt(), j.getCancelReason(),
                j.getSaleId(), items, files, payments, j.getCreatedAt(), j.getUpdatedAt());
    }

    private JobFileResponse toFile(JobOrderFile f, boolean withUrl) {
        String url = null;
        if (withUrl) {
            try {
                url = storageService.createSignedDownloadUrl(f.getBucket(), f.getPath(), 3600);
            } catch (BusinessException e) {
                url = null; // storage not configured (e.g. local dev without service key)
            }
        }
        return new JobFileResponse(f.getId(), f.getFileName(), f.getContentType(), f.getSizeBytes(), f.getPath(), url, f.getCreatedAt());
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
