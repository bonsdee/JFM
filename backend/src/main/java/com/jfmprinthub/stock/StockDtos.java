package com.jfmprinthub.stock;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class StockDtos {

    private StockDtos() {}

    public record StockInItem(@NotNull UUID productId,
                              @NotNull @DecimalMin(value = "0.001") BigDecimal quantity,
                              @DecimalMin("0") BigDecimal unitCost) {}

    public record StockInRequest(@NotNull MovementReason reason,
                                 @Size(max = 40) String referenceNo,
                                 String notes,
                                 @NotEmpty List<@Valid StockInItem> items) {}

    public record StockOutItem(@NotNull UUID productId,
                               @NotNull @DecimalMin(value = "0.001") BigDecimal quantity) {}

    public record StockOutRequest(@NotNull MovementReason reason,
                                  @Size(max = 40) String referenceNo,
                                  String notes,
                                  @NotEmpty List<@Valid StockOutItem> items) {}

    public record CountItem(@NotNull UUID productId, @NotNull @DecimalMin("0") BigDecimal countedQuantity) {}

    public record PhysicalCountRequest(String notes, @NotEmpty List<@Valid CountItem> items) {}

    public record CountResultLine(UUID productId, String sku, String name, BigDecimal systemQuantity,
                                  BigDecimal countedQuantity, BigDecimal difference, boolean posted) {}

    public record MovementResponse(UUID id, UUID productId, String sku, String productName, String unit,
                                   MovementType type, MovementReason reason, BigDecimal quantity,
                                   BigDecimal unitCost, BigDecimal balanceAfter, String referenceType,
                                   UUID referenceId, String referenceNo, String notes, Instant createdAt) {
        public static MovementResponse from(StockMovement m) {
            var p = m.getProduct();
            return new MovementResponse(m.getId(), p.getId(), p.getSku(), p.getName(), p.getUnit().name(),
                    m.getType(), m.getReason(), m.getQuantity(), m.getUnitCost(), m.getBalanceAfter(),
                    m.getReferenceType(), m.getReferenceId(), m.getReferenceNo(), m.getNotes(), m.getCreatedAt());
        }
    }

    public record ReconciliationLine(UUID productId, String sku, String name, BigDecimal ledgerQuantity,
                                     BigDecimal cachedQuantity) {}
}
