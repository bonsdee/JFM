package com.jfmprinthub.expense;

import com.jfmprinthub.expense.ExpenseDtos.ExpenseCategoryRequest;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseCategoryResponse;
import com.jfmprinthub.expense.ExpenseDtos.ExpensePage;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseRequest;
import com.jfmprinthub.expense.ExpenseDtos.ExpenseResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Tag(name = "Expenses")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService service;

    @GetMapping("/expenses")
    public ExpensePage list(@RequestParam(required = false) UUID categoryId,
                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                            @RequestParam(required = false) String q,
                            @RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "20") int size,
                            @RequestParam(required = false) String sort) {
        return service.search(categoryId, from, to, q, page, size, sort);
    }

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@Valid @RequestBody ExpenseRequest request) {
        return service.create(request);
    }

    @PutMapping("/expenses/{id}")
    public ExpenseResponse update(@PathVariable UUID id, @Valid @RequestBody ExpenseRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/expenses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/expense-categories")
    public List<ExpenseCategoryResponse> categories() {
        return service.categories();
    }

    @PostMapping("/expense-categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseCategoryResponse createCategory(@Valid @RequestBody ExpenseCategoryRequest request) {
        return service.createCategory(request);
    }

    @PutMapping("/expense-categories/{id}")
    public ExpenseCategoryResponse updateCategory(@PathVariable UUID id, @Valid @RequestBody ExpenseCategoryRequest request) {
        return service.updateCategory(id, request);
    }

    @DeleteMapping("/expense-categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable UUID id) {
        service.deleteCategory(id);
    }
}
