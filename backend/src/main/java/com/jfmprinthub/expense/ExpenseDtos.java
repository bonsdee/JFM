package com.jfmprinthub.expense;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class ExpenseDtos {

    private ExpenseDtos() {}

    public record ExpenseRequest(@NotNull UUID categoryId, @NotBlank @Size(max = 255) String description,
                                 @NotNull @DecimalMin("0.01") BigDecimal amount, @NotNull LocalDate expenseDate,
                                 PaymentMethod paymentMethod, String notes) {}

    public record ExpenseResponse(UUID id, UUID categoryId, String categoryName, String description, BigDecimal amount,
                                  LocalDate expenseDate, PaymentMethod paymentMethod, String notes, Instant createdAt) {}

    public record ExpenseCategoryRequest(@NotBlank @Size(max = 80) String name, String description) {}

    public record ExpenseCategoryResponse(UUID id, String name, String description, long expenseCount) {}

    public record ExpensePage(PageResponse<ExpenseResponse> page, BigDecimal total) {}
}
