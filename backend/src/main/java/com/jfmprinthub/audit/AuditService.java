package com.jfmprinthub.audit;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Writes audit entries inside the caller's transaction so a rolled-back change
 * never leaves an orphan audit row. The actor is always the owner, but it is logged anyway.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    @Transactional
    public void record(AuditAction action, String entityType, Object entityId, String summary) {
        record(action, entityType, entityId, summary, null);
    }

    @Transactional
    public void record(AuditAction action, String entityType, Object entityId, String summary, Map<String, Object> details) {
        AuditLog log = new AuditLog();
        log.setActorId(CurrentUser.id());
        log.setActorEmail(CurrentUser.email());
        log.setAction(action.name());
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : entityId.toString());
        log.setSummary(summary != null && summary.length() > 255 ? summary.substring(0, 255) : summary);
        log.setDetails(details);
        repository.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> search(String entityType, String action, String q, Instant from, Instant to,
                                                 int page, int size) {
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (entityType != null && !entityType.isBlank()) p.add(cb.equal(root.get("entityType"), entityType));
            if (action != null && !action.isBlank()) p.add(cb.equal(root.get("action"), action));
            if (q != null && !q.isBlank()) p.add(cb.like(cb.lower(root.get("summary")), "%" + q.toLowerCase() + "%"));
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) p.add(cb.lessThan(root.get("createdAt"), to));
            return cb.and(p.toArray(Predicate[]::new));
        };
        var pageable = Pageables.of(page, size, null, Set.of("createdAt"), "createdAt", Sort.Direction.DESC);
        return PageResponse.of(repository.findAll(spec, pageable), AuditLogResponse::from);
    }

    public record AuditLogResponse(String id, String actorEmail, String action, String entityType, String entityId,
                                   String summary, Map<String, Object> details, Instant createdAt) {
        static AuditLogResponse from(AuditLog a) {
            return new AuditLogResponse(a.getId().toString(), a.getActorEmail(), a.getAction(), a.getEntityType(),
                    a.getEntityId(), a.getSummary(), a.getDetails(), a.getCreatedAt());
        }
    }
}
