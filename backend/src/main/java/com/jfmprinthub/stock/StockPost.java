package com.jfmprinthub.stock;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command to post one ledger movement.
 *
 * @param quantity signed delta (positive adds stock, negative removes it)
 * @param unitCost purchase cost for IN movements (drives weighted average); ignored for OUT
 */
public record StockPost(
        UUID productId,
        MovementType type,
        MovementReason reason,
        BigDecimal quantity,
        BigDecimal unitCost,
        String referenceType,
        UUID referenceId,
        String referenceNo,
        String notes
) {
    public static StockPost in(UUID productId, MovementReason reason, BigDecimal qty, BigDecimal unitCost,
                               String refType, UUID refId, String refNo, String notes) {
        return new StockPost(productId, MovementType.IN, reason, qty.abs(), unitCost, refType, refId, refNo, notes);
    }

    public static StockPost out(UUID productId, MovementReason reason, BigDecimal qty,
                                String refType, UUID refId, String refNo, String notes) {
        return new StockPost(productId, MovementType.OUT, reason, qty.abs().negate(), null, refType, refId, refNo, notes);
    }

    public static StockPost adjust(UUID productId, MovementReason reason, BigDecimal delta, String notes) {
        return new StockPost(productId, MovementType.ADJUST, reason, delta, null, null, null, null, notes);
    }
}
