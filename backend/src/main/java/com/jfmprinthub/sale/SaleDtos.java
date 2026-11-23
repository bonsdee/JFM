package com.jfmprinthub.sale;

import com.jfmprinthub.common.PaymentMethod;
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

public final class SaleDtos {

    private SaleDtos() {}

    /**
     * One cart line. PRODUCT lines need productId + quantity (unitPrice optional override);
     * SERVICE lines need a {@code quote} which is re-priced server-side.
     */
    public record CartLine(
            @NotNull SaleItem.LineType type,
            UUID productId,
            @DecimalMin("0.001") BigDecimal quantity,
            @DecimalMin("0") BigDecimal unitPrice,
            @Valid QuoteRequest quote) {}

    public record CheckoutRequest(
            UUID customerId,
            @NotEmpty List<@Valid CartLine> items,
            Sale.DiscountType discountType,
            @DecimalMin("0") BigDecimal discountValue,
            @NotNull PaymentMethod paymentMethod,
            @DecimalMin("0") BigDecimal amountTendered,
            @Size(max = 60) String referenceNo,
            String notes) {}

    public record VoidRequest(@NotBlank @Size(max = 500) String reason) {}

    public record SaleItemResponse(UUID id, SaleItem.LineType lineType, UUID productId, UUID serviceId,
                                   String description, Map<String, Object> specs, BigDecimal quantity,
                                   BigDecimal unitPrice, BigDecimal lineTotal, BigDecimal unitCost,
                                   BigDecimal costTotal) {}

    public record PaymentResponse(UUID id, PaymentMethod method, BigDecimal amount, String referenceNo,
                                  String notes, boolean voided, Instant paidAt) {
        public static PaymentResponse from(Payment p) {
            return new PaymentResponse(p.getId(), p.getMethod(), p.getAmount(), p.getReferenceNo(), p.getNotes(),
                    p.isVoided(), p.getPaidAt());
        }
    }

    public record SaleSummary(UUID id, String saleNumber, Sale.Source source, Sale.Status status, UUID customerId,
                              String customerName, BigDecimal total, BigDecimal grossProfit, int itemCount,
                              String paymentMethods, Instant soldAt) {}

    public record SaleResponse(UUID id, String saleNumber, Sale.Source source, Sale.Status status, UUID customerId,
                               String customerName, UUID jobOrderId, BigDecimal subtotal, Sale.DiscountType discountType,
                               BigDecimal discountValue, BigDecimal discountAmount, BigDecimal taxAmount,
                               BigDecimal total, BigDecimal costTotal, BigDecimal grossProfit,
                               BigDecimal amountTendered, BigDecimal changeDue, String notes, Instant soldAt,
                               Instant voidedAt, String voidReason, List<SaleItemResponse> items,
                               List<PaymentResponse> payments) {}
}
