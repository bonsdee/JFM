package com.jfmprinthub.inquiry;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.NotFoundException;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository repository;
    private final AuditService auditService;

    /** Public form payload. {@code website} is a honeypot: bots fill it, humans never see it. */
    public record InquiryRequest(@NotBlank @Size(max = 120) String name, @Email @Size(max = 150) String email,
                                 @Size(max = 40) String phone, @Size(max = 150) String subject,
                                 @Size(max = 120) String serviceInterest,
                                 @NotBlank @Size(min = 5, max = 3000) String message,
                                 @Size(max = 0, message = "must be empty") String website) {}

    public record InquiryResponse(UUID id, String name, String email, String phone, String subject,
                                  String serviceInterest, String message, Inquiry.Status status, Instant createdAt) {
        static InquiryResponse from(Inquiry i) {
            return new InquiryResponse(i.getId(), i.getName(), i.getEmail(), i.getPhone(), i.getSubject(),
                    i.getServiceInterest(), i.getMessage(), i.getStatus(), i.getCreatedAt());
        }
    }

    public record StatusRequest(@NotNull Inquiry.Status status) {}

    @Transactional
    public void submit(InquiryRequest r, String ip) {
        if (r.website() != null && !r.website().isBlank()) return; // silently drop bot submissions
        Inquiry i = new Inquiry();
        i.setName(r.name().trim());
        i.setEmail(r.email());
        i.setPhone(r.phone());
        i.setSubject(r.subject());
        i.setServiceInterest(r.serviceInterest());
        i.setMessage(r.message().trim());
        i.setIpAddress(ip);
        repository.save(i);
    }

    @Transactional(readOnly = true)
    public PageResponse<InquiryResponse> search(Collection<Inquiry.Status> statuses, String q, int page, int size) {
        Collection<Inquiry.Status> st = statuses == null || statuses.isEmpty()
                ? EnumSet.of(Inquiry.Status.NEW, Inquiry.Status.READ, Inquiry.Status.REPLIED) : statuses;
        var pageable = Pageables.of(page, size, null, Set.of("createdAt"), "createdAt", Sort.Direction.DESC);
        return PageResponse.of(repository.search(st, q == null || q.isBlank() ? null : q.trim(), pageable), InquiryResponse::from);
    }

    @Transactional
    public InquiryResponse setStatus(UUID id, Inquiry.Status status) {
        Inquiry i = repository.findById(id).orElseThrow(() -> NotFoundException.of("Inquiry", id));
        i.setStatus(status);
        auditService.record(AuditAction.STATUS_CHANGE, "INQUIRY", id, "Inquiry from " + i.getName() + " → " + status);
        return InquiryResponse.from(i);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return repository.countByStatus(Inquiry.Status.NEW);
    }
}
