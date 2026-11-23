package com.jfmprinthub.stock;

import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.settings.BusinessSettings;
import com.jfmprinthub.settings.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock ProductRepository productRepository;
    @Mock StockMovementRepository movementRepository;
    @Mock SettingsService settingsService;

    StockService service;
    BusinessSettings settings;

    @BeforeEach
    void setUp() {
        service = new StockService(productRepository, movementRepository, settingsService);
        settings = new BusinessSettings();
        settings.setAllowNegativeStock(false);
        lenient().when(settingsService.entity()).thenReturn(settings);
    }

    private Product product(String qty, String cost) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setSku("PRD-1");
        p.setName("Test");
        p.setUnit(Product.Unit.PCS);
        p.setStockOnHand(new BigDecimal(qty));
        p.setCostPrice(new BigDecimal(cost));
        return p;
    }

    @Test
    void stockInRecalculatesWeightedAverageAndWritesLedgerRow() {
        Product p = product("10", "12.00");
        when(productRepository.findByIdForUpdate(p.getId())).thenReturn(Optional.of(p));

        StockMovement m = service.post(StockPost.in(p.getId(), MovementReason.PURCHASE_RECEIVED,
                new BigDecimal("30"), new BigDecimal("16.00"), "PURCHASE_ORDER", null, "PO-1", null));

        // (10 × 12 + 30 × 16) / 40 = 15.00
        assertThat(p.getCostPrice()).isEqualByComparingTo("15.00");
        assertThat(p.getStockOnHand()).isEqualByComparingTo("40");
        assertThat(m.getBalanceAfter()).isEqualByComparingTo("40");
        assertThat(m.getUnitCost()).isEqualByComparingTo("16.00");
        verify(movementRepository).save(any(StockMovement.class));
    }

    @Test
    void stockInOnEmptyStockReplacesAverage() {
        assertThat(StockService.weightedAverage(BigDecimal.ZERO, new BigDecimal("99"), BigDecimal.TEN, new BigDecimal("5.50")))
                .isEqualByComparingTo("5.50");
        assertThat(StockService.weightedAverage(new BigDecimal("-2"), new BigDecimal("99"), BigDecimal.TEN, new BigDecimal("5.50")))
                .isEqualByComparingTo("5.50");
    }

    @Test
    void stockOutUsesCurrentAverageCostAndDoesNotChangeIt() {
        Product p = product("20", "8.40");
        when(productRepository.findByIdForUpdate(p.getId())).thenReturn(Optional.of(p));

        StockMovement m = service.post(StockPost.out(p.getId(), MovementReason.SALE, new BigDecimal("3"), "SALE", null, "S-1", null));

        assertThat(m.getQuantity()).isEqualByComparingTo("-3");
        assertThat(m.getUnitCost()).isEqualByComparingTo("8.40");
        assertThat(p.getCostPrice()).isEqualByComparingTo("8.40");
        assertThat(p.getStockOnHand()).isEqualByComparingTo("17");
    }

    @Test
    void preventsNegativeStockWhenPolicyDisallows() {
        Product p = product("2", "5");
        when(productRepository.findByIdForUpdate(p.getId())).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.post(StockPost.out(p.getId(), MovementReason.SALE, new BigDecimal("3"), null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("INSUFFICIENT_STOCK");
        assertThat(p.getStockOnHand()).isEqualByComparingTo("2");
        verify(movementRepository, never()).save(any());
    }

    @Test
    void allowsNegativeStockWhenConfigured() {
        settings.setAllowNegativeStock(true);
        Product p = product("2", "5");
        when(productRepository.findByIdForUpdate(p.getId())).thenReturn(Optional.of(p));

        StockMovement m = service.post(StockPost.out(p.getId(), MovementReason.SALE, new BigDecimal("3"), null, null, null, null));
        assertThat(m.getBalanceAfter()).isEqualByComparingTo("-1");
    }

    @Test
    void rejectsSignMismatchAndZeroQuantity() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> service.post(new StockPost(id, MovementType.IN, MovementReason.MANUAL_ADJUSTMENT,
                new BigDecimal("-1"), null, null, null, null, null))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.post(new StockPost(id, MovementType.OUT, MovementReason.DAMAGED,
                BigDecimal.ZERO, null, null, null, null, null))).isInstanceOf(BusinessException.class);
    }

    @Test
    void postAllLocksProductsInIdOrderButPostsInInputOrder() {
        Product a = product("100", "1");
        Product b = product("100", "1");
        a.setId(UUID.fromString("00000000-0000-0000-0000-00000000000b"));
        b.setId(UUID.fromString("00000000-0000-0000-0000-00000000000a"));
        when(productRepository.findByIdForUpdate(a.getId())).thenReturn(Optional.of(a));
        when(productRepository.findByIdForUpdate(b.getId())).thenReturn(Optional.of(b));

        List<StockMovement> result = service.postAll(List.of(
                StockPost.out(a.getId(), MovementReason.SALE, BigDecimal.ONE, null, null, null, null),
                StockPost.out(b.getId(), MovementReason.SALE, BigDecimal.TEN, null, null, null, null)));

        // Locks are taken in ascending id order (…0a before …0b), then each post re-reads under the held lock.
        ArgumentCaptor<UUID> locked = ArgumentCaptor.forClass(UUID.class);
        verify(productRepository, org.mockito.Mockito.atLeast(2)).findByIdForUpdate(locked.capture());
        assertThat(locked.getAllValues().subList(0, 2)).containsExactly(b.getId(), a.getId());
        assertThat(result.get(0).getProduct()).isSameAs(a);
        assertThat(result.get(1).getProduct()).isSameAs(b);

        ArgumentCaptor<StockMovement> saved = ArgumentCaptor.forClass(StockMovement.class);
        verify(movementRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(StockMovement::getQuantity)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("-1"), new BigDecimal("-10"));
    }
}
