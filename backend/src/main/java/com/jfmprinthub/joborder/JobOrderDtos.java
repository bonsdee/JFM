package com.jfmprinthub.joborder;

import com.jfmprinthub.common.PaymentMethod;
import com.jfmprinthub.sale.SaleDtos.PaymentResponse;
import com.jfmprinthub.service.PricingDtos.QuoteRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class JobOrderDtos {

    private JobOrderDtos() {}

    public record PaymentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount, @NotNull PaymentMethod method,
                                 @Size(max = 60) String referenceNo, @Size(max = 200) String notes) {}

    public record JobItemRequest(@NotNull @Valid QuoteRequest quote, @Size(max = 255) String description) {}

    public record JobOrderRequest(
            UUID customerId,
            @Size(max = 150) String customerName,
            @Size(max = 40) String customerPhone,
            Instant dueAt,
            String notes,
            @DecimalMin("0") BigDecimal discountAmount,
            @NotEmpty List<@Valid JobItemRequest> items,
            @Valid PaymentRequest downpayment) {}

    public record StatusChangeRequest(@NotNull JobStatus status, Integer position, @Size(max = 500) String reason) {}

    public record ClaimRequest(@Valid PaymentRequest balancePayment) {}

    public record CancelRequest(@NotBlank @Size(max = 500) String reason) {}

    public record FileAttachRequest(@NotBlank String path, @NotBlank @Size(max = 255) String fileName,
                                    @Size(max = 120) String contentType, Long sizeBytes) {}

    public record JobItemResponse(UUID id, UUID serviceId, String serviceName, String description,
                                  Map<String, Object> specs, BigDecimal quantity, BigDecimal unitPrice,
                                  BigDecimal lineTotal, BigDecimal materialCost) {}

    public record JobFileResponse(UUID id, String fileName, String contentType, Long sizeBytes, String path,
                                  String downloadUrl, Instant createdAt) {}

    public record JobOrderSummary(UUID id, String jobNumber, String customerName, String customerPhone,
                                  JobStatus status, Instant dueAt, boolean overdue, BigDecimal total,
                                  BigDecimal amountPaid, BigDecimal balance, String itemsSummary,
                                  int fileCount, int boardPosition, Instant createdAt) {}

    public record JobOrderResponse(UUID id, String jobNumber, UUID customerId, String customerName,
                                   String customerPhone, JobStatus status, Instant dueAt, boolean overdue,
                                   String notes, BigDecimal subtotal, BigDecimal discountAmount, BigDecimal total,
                                   BigDecimal amountPaid, BigDecimal balance, boolean materialsConsumed,
                                   Instant printedAt, Instant claimedAt, Instant cancelledAt, String cancelReason,
                                   UUID saleId, List<JobItemResponse> items, List<JobFileResponse> files,
                                   List<PaymentResponse> payments, Instant createdAt, Instant updatedAt) {}
}
