package com.jfmprinthub.notification;

import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.inquiry.Inquiry;
import com.jfmprinthub.inquiry.InquiryRepository;
import com.jfmprinthub.joborder.JobOrder;
import com.jfmprinthub.joborder.JobOrderRepository;
import com.jfmprinthub.notification.Notification.Severity;
import com.jfmprinthub.notification.Notification.Type;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.purchase.PurchaseOrder;
import com.jfmprinthub.purchase.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Derives notifications from current state (low stock, overdue / due-soon jobs, unpaid POs, new inquiries).
 * Runs every 10 minutes and lazily (at most once a minute) when the bell is opened.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final DateTimeFormatter DUE = DateTimeFormatter.ofPattern("MMM d, h:mm a");

    private final NotificationRepository repository;
    private final ProductRepository productRepository;
    private final JobOrderRepository jobOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InquiryRepository inquiryRepository;
    private final AtomicReference<Instant> lastRefresh = new AtomicReference<>(Instant.EPOCH);

    public record NotificationResponse(UUID id, Type type, Severity severity, String title, String message, String link,
                                       boolean read, Instant createdAt) {
        static NotificationResponse from(Notification n) {
            return new NotificationResponse(n.getId(), n.getType(), n.getSeverity(), n.getTitle(), n.getMessage(), n.getLink(),
                    n.isRead(), n.getCreatedAt());
        }
    }

    public record NotificationFeed(long unread, List<NotificationResponse> items) {}

    @Transactional
    public NotificationFeed feed() {
        if (Duration.between(lastRefresh.get(), Instant.now()).toSeconds() > 60) refresh();
        List<NotificationResponse> items = repository.findAllByOrderByReadAscCreatedAtDesc().stream()
                .limit(50).map(NotificationResponse::from).toList();
        return new NotificationFeed(repository.countByReadFalse(), items);
    }

    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT30S")
    @Transactional
    public void refresh() {
        Map<String, Draft> wanted = new HashMap<>();

        for (Product p : productRepository.findLowStock()) {
            boolean out = p.getStockOnHand().signum() <= 0;
            wanted.put("STOCK:" + p.getId(), new Draft(out ? Type.OUT_OF_STOCK : Type.LOW_STOCK, out ? Severity.DANGER : Severity.WARNING,
                    (out ? "Out of stock: " : "Low stock: ") + p.getName(),
                    "On hand " + p.getStockOnHand().stripTrailingZeros().toPlainString() + " " + p.getUnit().name().toLowerCase()
                            + " • reorder at " + p.getReorderLevel().stripTrailingZeros().toPlainString(),
                    "/app/inventory/products/" + p.getId()));
        }

        Instant now = Instant.now();
        for (JobOrder j : jobOrderRepository.findOpenDueBefore(now.plus(Duration.ofHours(24)))) {
            boolean overdue = j.getDueAt().isBefore(now);
            wanted.put("JOB:" + j.getId() + (overdue ? ":OVERDUE" : ":SOON"), new Draft(overdue ? Type.OVERDUE_JOB : Type.JOB_DUE_SOON,
                    overdue ? Severity.DANGER : Severity.INFO,
                    (overdue ? "Overdue: " : "Due soon: ") + j.getJobNumber() + " — " + j.displayCustomer(),
                    "Due " + DUE.format(j.getDueAt().atZone(BusinessTime.ZONE)) + " • " + j.getStatus().name().replace('_', ' '),
                    "/app/jobs/" + j.getId()));
        }

        for (PurchaseOrder po : purchaseOrderRepository.findUnpaid()) {
            wanted.put("PO:" + po.getId(), new Draft(Type.UNPAID_PO, Severity.WARNING,
                    "Unpaid balance: " + po.getPoNumber(),
                    po.getSupplier().getName() + " • ₱" + po.balance().toPlainString() + " due",
                    "/app/purchasing/orders/" + po.getId()));
        }

        long newInquiries = inquiryRepository.countByStatus(Inquiry.Status.NEW);
        if (newInquiries > 0) {
            wanted.put("INQUIRY:NEW", new Draft(Type.NEW_INQUIRY, Severity.INFO,
                    newInquiries + " new inquir" + (newInquiries == 1 ? "y" : "ies"), "From the website contact form",
                    "/app/inquiries"));
        }

        // Upsert wanted, delete resolved.
        Map<String, Notification> existing = new HashMap<>();
        for (Notification n : repository.findAll()) existing.put(n.getDedupeKey(), n);
        for (var e : wanted.entrySet()) {
            Notification n = existing.remove(e.getKey());
            Draft d = e.getValue();
            if (n == null) {
                n = new Notification();
                n.setDedupeKey(e.getKey());
            } else if (!d.title().equals(n.getTitle())) {
                n.setRead(false); // changed condition (e.g. low → out) resurfaces
            }
            n.setType(d.type());
            n.setSeverity(d.severity());
            n.setTitle(d.title());
            n.setMessage(d.message());
            n.setLink(d.link());
            repository.save(n);
        }
        repository.deleteAll(existing.values());
        lastRefresh.set(Instant.now());
        log.debug("Notifications refreshed: {} active, {} resolved", wanted.size(), existing.size());
    }

    @Transactional
    public void markRead(UUID id) {
        Notification n = repository.findById(id).orElseThrow(() -> NotFoundException.of("Notification", id));
        n.setRead(true);
    }

    @Transactional
    public void markAllRead() {
        repository.markAllRead();
    }

    private record Draft(Type type, Severity severity, String title, String message, String link) {}
}
