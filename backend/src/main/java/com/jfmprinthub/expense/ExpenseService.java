package com.jfmprinthub.expense;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseCategoryRequest;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseCategoryResponse;
import com.jfmprinthub.expense.ExpenseDtos.ExpensePage;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseRequest;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository repository;
    private final ExpenseCategoryRepository categoryRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public ExpensePage search(UUID categoryId, LocalDate from, LocalDate to, String q, int page, int size, String sort) {
        String term = q == null || q.isBlank() ? null : q.trim();
        var pageable = Pageables.of(page, size, sort, Set.of("expenseDate", "amount", "createdAt"), "expenseDate", Sort.Direction.DESC);
        var result = PageResponse.of(repository.search(categoryId, from, to, term, pageable), this::toResponse);
        return new ExpensePage(result, repository.sum(categoryId, from, to, term));
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest r) {
        Expense e = new Expense();
        apply(e, r);
        repository.save(e);
        auditService.record(AuditAction.CREATE, "EXPENSE", e.getId(), "Expense ₱" + e.getAmount().toPlainString() + " — " + e.getDescription());
        return toResponse(e);
    }

    @Transactional
    public ExpenseResponse update(UUID id, ExpenseRequest r) {
        Expense e = repository.findById(id).orElseThrow(() -> NotFoundException.of("Expense", id));
        apply(e, r);
        auditService.record(AuditAction.UPDATE, "EXPENSE", id, "Updated expense " + e.getDescription());
        return toResponse(e);
    }

    @Transactional
    public void delete(UUID id) {
        Expense e = repository.findById(id).orElseThrow(() -> NotFoundException.of("Expense", id));
        repository.delete(e);
        auditService.record(AuditAction.DELETE, "EXPENSE", id, "Deleted expense ₱" + e.getAmount().toPlainString() + " — " + e.getDescription());
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategoryResponse> categories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(c -> new ExpenseCategoryResponse(c.getId(), c.getName(), c.getDescription(), repository.countByCategoryId(c.getId())))
                .toList();
    }

    @Transactional
    public ExpenseCategoryResponse createCategory(ExpenseCategoryRequest r) {
        if (categoryRepository.existsByNameIgnoreCase(r.name().trim())) {
            throw BusinessException.conflict("DUPLICATE_CATEGORY", "Expense category already exists");
        }
        ExpenseCategory c = new ExpenseCategory();
        c.setName(r.name().trim());
        c.setDescription(r.description());
        categoryRepository.save(c);
        auditService.record(AuditAction.CREATE, "EXPENSE_CATEGORY", c.getId(), "Created expense category " + c.getName());
        return new ExpenseCategoryResponse(c.getId(), c.getName(), c.getDescription(), 0);
    }

    @Transactional
    public ExpenseCategoryResponse updateCategory(UUID id, ExpenseCategoryRequest r) {
        ExpenseCategory c = categoryRepository.findById(id).orElseThrow(() -> NotFoundException.of("Expense category", id));
        c.setName(r.name().trim());
        c.setDescription(r.description());
        auditService.record(AuditAction.UPDATE, "EXPENSE_CATEGORY", id, "Updated expense category " + c.getName());
        return new ExpenseCategoryResponse(c.getId(), c.getName(), c.getDescription(), repository.countByCategoryId(id));
    }

    @Transactional
    public void deleteCategory(UUID id) {
        ExpenseCategory c = categoryRepository.findById(id).orElseThrow(() -> NotFoundException.of("Expense category", id));
        if (repository.countByCategoryId(id) > 0) throw BusinessException.conflict("CATEGORY_IN_USE", "Category has expenses");
        categoryRepository.delete(c);
        auditService.record(AuditAction.DELETE, "EXPENSE_CATEGORY", id, "Deleted expense category " + c.getName());
    }

    private void apply(Expense e, ExpenseRequest r) {
        e.setCategory(categoryRepository.findById(r.categoryId()).orElseThrow(() -> NotFoundException.of("Expense category", r.categoryId())));
        e.setDescription(r.description().trim());
        e.setAmount(Money.of(r.amount()));
        e.setExpenseDate(r.expenseDate());
        e.setPaymentMethod(r.paymentMethod());
        e.setNotes(r.notes());
    }

    private ExpenseResponse toResponse(Expense e) {
        return new ExpenseResponse(e.getId(), e.getCategory().getId(), e.getCategory().getName(), e.getDescription(),
                e.getAmount(), e.getExpenseDate(), e.getPaymentMethod(), e.getNotes(), e.getCreatedAt());
    }
}
