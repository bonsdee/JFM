package com.jfmprinthub.purchase;

import com.jfmprinthub.common.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PurchaseDtos {

    private PurchaseDtos() {}

    public record POItemRequest(@NotNull UUID productId, @NotNull @DecimalMin("0.001") BigDecimal qtyOrdered,
                                @NotNull @DecimalMin("0") BigDecimal unitCost) {}

    public record PORequest(@NotNull UUID supplierId, LocalDate orderDate, LocalDate expectedDate, String notes,
                            @NotEmpty List<@Valid POItemRequest> items) {}

    public record ReceiveLine(@NotNull UUID itemId, @NotNull @DecimalMin("0") BigDecimal quantity,
                              @DecimalMin("0") BigDecimal unitCost) {}

    public record ReceiveRequest(@NotEmpty List<@Valid ReceiveLine> lines, @Size(max = 500) String notes) {}

    public record SupplierPaymentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount, @NotNull PaymentMethod method,
                                         @Size(max = 60) String referenceNo, String notes, Instant paidAt) {}

    public record SuggestionCreateRequest(@NotEmpty List<@Valid SuggestionLine> items) {}

    public record SuggestionLine(@NotNull UUID productId, @NotNull @DecimalMin("0.001") BigDecimal quantity,
                                 @DecimalMin("0") BigDecimal unitCost, UUID supplierId) {}

    public record POItemResponse(UUID id, UUID productId, String sku, String productName, String unit,
                                 BigDecimal qtyOrdered, BigDecimal qtyReceived, BigDecimal remaining,
                                 BigDecimal unitCost, BigDecimal lineTotal) {}

    public record SupplierPaymentResponse(UUID id, BigDecimal amount, PaymentMethod method, String referenceNo,
                                          String notes, Instant paidAt) {}

    public record POSummary(UUID id, String poNumber, UUID supplierId, String supplierName, PurchaseOrder.Status status,
                            LocalDate orderDate, LocalDate expectedDate, int itemCount, BigDecimal totalAmount,
                            BigDecimal amountPaid, BigDecimal balance, Instant createdAt) {}

    public record POResponse(UUID id, String poNumber, UUID supplierId, String supplierName, String supplierPhone,
                             String supplierEmail, PurchaseOrder.Status status, LocalDate orderDate,
                             LocalDate expectedDate, String notes, BigDecimal totalAmount, BigDecimal receivedValue,
                             BigDecimal amountPaid, BigDecimal balance, Instant orderedAt, Instant receivedAt,
                             Instant cancelledAt, List<POItemResponse> items, List<SupplierPaymentResponse> payments,
                             Instant createdAt) {}

    public record ReorderSuggestion(UUID productId, String sku, String name, String unit, BigDecimal stockOnHand,
                                    BigDecimal reorderLevel, BigDecimal onOrder, BigDecimal suggestedQty,
                                    BigDecimal lastCost, UUID supplierId, String supplierName) {}

    public record SuggestionGroup(UUID supplierId, String supplierName, List<ReorderSuggestion> items,
                                  BigDecimal estimatedTotal) {}

    public record PurchaseHistorySummary(long orders, BigDecimal totalOrdered, BigDecimal totalReceived,
                                         BigDecimal totalPaid, BigDecimal totalPayables) {}
}
