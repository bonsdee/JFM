package com.jfmprinthub.stock;

import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.settings.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * The ONLY component allowed to change product stock.
 * <p>
 * For each posting it: locks the product row ({@code SELECT ... FOR UPDATE}), validates the sign and the
 * negative-stock policy, recalculates weighted average cost on stock-in, updates the cached balance and
 * appends an immutable {@link StockMovement}. It always joins the caller's transaction so a sale,
 * PO receipt or job consumption either fully succeeds or leaves no trace.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StockService {

    private final ProductRepository productRepository;
    private final StockMovementRepository movementRepository;
    private final SettingsService settingsService;

    @Transactional(propagation = Propagation.REQUIRED)
    public StockMovement post(StockPost cmd) {
        return post(cmd, settingsService.entity().isAllowNegativeStock());
    }

    /**
     * Posts several movements atomically. All affected product rows are first locked in a deterministic
     * (id) order to prevent deadlocks between concurrent transactions; movements are then posted and
     * returned in the SAME order as {@code commands} so callers can map costs back to their lines.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public List<StockMovement> postAll(List<StockPost> commands) {
        boolean allowNegative = settingsService.entity().isAllowNegativeStock();
        lockAll(commands.stream().map(StockPost::productId).toList());
        List<StockMovement> result = new ArrayList<>(commands.size());
        for (StockPost cmd : commands) result.add(post(cmd, allowNegative));
        return result;
    }

    /** Acquires row locks on the given products in ascending id order. */
    @Transactional(propagation = Propagation.REQUIRED)
    public void lockAll(java.util.Collection<UUID> productIds) {
        productIds.stream().filter(java.util.Objects::nonNull).distinct()
                .sorted(Comparator.comparing(UUID::toString))
                .forEach(id -> productRepository.findByIdForUpdate(id)
                        .orElseThrow(() -> NotFoundException.of("Product", id)));
    }

    StockMovement post(StockPost cmd, boolean allowNegative) {
        validate(cmd);
        Product product = productRepository.findByIdForUpdate(cmd.productId())
                .orElseThrow(() -> NotFoundException.of("Product", cmd.productId()));
        if (product.isArchived() && cmd.quantity().signum() < 0 && cmd.reason() != MovementReason.PHYSICAL_COUNT) {
            throw new BusinessException("PRODUCT_ARCHIVED", product.getName() + " is archived");
        }

        BigDecimal qty = Money.qty(cmd.quantity());
        BigDecimal before = product.getStockOnHand();
        BigDecimal after = before.add(qty);

        if (after.signum() < 0 && !allowNegative) {
            throw new BusinessException("INSUFFICIENT_STOCK", String.format(
                    "Not enough stock for %s: on hand %s %s, needed %s",
                    product.getName(), before.stripTrailingZeros().toPlainString(), product.getUnit(),
                    qty.abs().stripTrailingZeros().toPlainString()));
        }

        BigDecimal unitCost;
        if (qty.signum() > 0 && cmd.unitCost() != null && cmd.type() == MovementType.IN) {
            unitCost = Money.of(cmd.unitCost());
            product.setCostPrice(weightedAverage(before, product.getCostPrice(), qty, unitCost));
        } else {
            unitCost = product.getCostPrice();
        }
        product.setStockOnHand(after);

        StockMovement m = new StockMovement();
        m.setProduct(product);
        m.setType(cmd.type());
        m.setReason(cmd.reason());
        m.setQuantity(qty);
        m.setUnitCost(unitCost);
        m.setBalanceAfter(after);
        m.setReferenceType(cmd.referenceType());
        m.setReferenceId(cmd.referenceId());
        m.setReferenceNo(cmd.referenceNo());
        m.setNotes(cmd.notes());
        movementRepository.save(m);
        log.debug("Stock {} {} {} -> {}", product.getSku(), cmd.reason(), qty, after);
        return m;
    }

    /**
     * Weighted average cost: (onHand × avg + received × cost) / (onHand + received).
     * When current stock is zero or negative the new cost simply replaces the average.
     */
    public static BigDecimal weightedAverage(BigDecimal onHand, BigDecimal currentAvg, BigDecimal received, BigDecimal cost) {
        if (onHand.signum() <= 0) return Money.of(cost);
        BigDecimal totalQty = onHand.add(received);
        BigDecimal totalValue = onHand.multiply(currentAvg).add(received.multiply(cost));
        return totalValue.divide(totalQty, 2, RoundingMode.HALF_UP);
    }

    private static void validate(StockPost cmd) {
        if (cmd.productId() == null) throw new BusinessException("INVALID_MOVEMENT", "Product is required");
        if (cmd.quantity() == null || cmd.quantity().signum() == 0) {
            throw new BusinessException("INVALID_MOVEMENT", "Quantity must not be zero");
        }
        boolean ok = switch (cmd.type()) {
            case IN -> cmd.quantity().signum() > 0;
            case OUT -> cmd.quantity().signum() < 0;
            case ADJUST -> true;
        };
        if (!ok) throw new BusinessException("INVALID_MOVEMENT", "Quantity sign does not match movement type " + cmd.type());
        if (cmd.reason() == null) throw new BusinessException("INVALID_MOVEMENT", "Reason is required");
    }
}
