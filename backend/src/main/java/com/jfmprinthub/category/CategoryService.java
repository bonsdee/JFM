package com.jfmprinthub.category;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.category.CategoryDtos.CategoryRequest;
import com.jfmprinthub.category.CategoryDtos.CategoryResponse;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository repository;
    private final CategoryMapper mapper;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(Category.Kind kind) {
        return repository.findAllByOrderByNameAsc().stream()
                .filter(c -> kind == null || c.getKind() == kind)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Category get(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Category", id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest r) {
        if (repository.existsByNameIgnoreCase(r.name().trim())) {
            throw BusinessException.conflict("DUPLICATE_CATEGORY", "A category named '" + r.name() + "' already exists");
        }
        Category c = new Category();
        mapper.update(r, c);
        c.setName(r.name().trim());
        repository.save(c);
        auditService.record(AuditAction.CREATE, "CATEGORY", c.getId(), "Created category " + c.getName());
        return toResponse(c);
    }

    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest r) {
        Category c = get(id);
        if (repository.existsByNameIgnoreCaseAndIdNot(r.name().trim(), id)) {
            throw BusinessException.conflict("DUPLICATE_CATEGORY", "A category named '" + r.name() + "' already exists");
        }
        mapper.update(r, c);
        c.setName(r.name().trim());
        auditService.record(AuditAction.UPDATE, "CATEGORY", c.getId(), "Updated category " + c.getName());
        return toResponse(c);
    }

    @Transactional
    public void delete(UUID id) {
        Category c = get(id);
        long used = repository.countProducts(id) + repository.countServices(id);
        if (used > 0) {
            throw BusinessException.conflict("CATEGORY_IN_USE",
                    "Category is used by " + used + " item(s). Reassign them before deleting.");
        }
        repository.delete(c);
        auditService.record(AuditAction.DELETE, "CATEGORY", id, "Deleted category " + c.getName());
    }

    private CategoryResponse toResponse(Category c) {
        long count = c.getKind() == Category.Kind.SERVICE ? repository.countServices(c.getId()) : repository.countProducts(c.getId());
        return mapper.toResponse(c, count);
    }
}
