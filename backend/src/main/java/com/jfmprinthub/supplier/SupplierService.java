package com.jfmprinthub.supplier;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.supplier.SupplierDtos.SupplierRequest;
import com.jfmprinthub.supplier.SupplierDtos.SupplierResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository repository;
    private final SupplierMapper mapper;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> search(String q, boolean archived, int page, int size, String sort) {
        var pageable = Pageables.of(page, size, sort, Set.of("name", "createdAt"), "name", Sort.Direction.ASC);
        return PageResponse.of(repository.search(blankToNull(q), archived, pageable), mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Supplier entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Supplier", id));
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(UUID id) {
        return mapper.toResponse(entity(id));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest r) {
        Supplier s = new Supplier();
        mapper.update(r, s);
        repository.save(s);
        auditService.record(AuditAction.CREATE, "SUPPLIER", s.getId(), "Created supplier " + s.getName());
        return mapper.toResponse(s);
    }

    @Transactional
    public SupplierResponse update(UUID id, SupplierRequest r) {
        Supplier s = entity(id);
        mapper.update(r, s);
        auditService.record(AuditAction.UPDATE, "SUPPLIER", s.getId(), "Updated supplier " + s.getName());
        return mapper.toResponse(s);
    }

    /** Soft delete — suppliers referenced by POs must remain for history. */
    @Transactional
    public SupplierResponse setArchived(UUID id, boolean archived) {
        Supplier s = entity(id);
        s.setArchived(archived);
        auditService.record(archived ? AuditAction.ARCHIVE : AuditAction.RESTORE, "SUPPLIER", id,
                (archived ? "Archived" : "Restored") + " supplier " + s.getName());
        return mapper.toResponse(s);
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
