package com.jfmprinthub.integration;

import com.jfmprinthub.common.PaymentMethod;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductDtos.ProductRequest;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.product.ProductService;
import com.jfmprinthub.sale.SaleDtos.CartLine;
import com.jfmprinthub.sale.SaleDtos.CheckoutRequest;
import com.jfmprinthub.sale.SaleItem;
import com.jfmprinthub.sale.SaleService;
import com.jfmprinthub.stock.StockOperationsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end against a real Postgres (Testcontainers): migrations + seed, a sale that would oversell rolls back
 * completely, and the ledger always reconciles with cached stock. Skipped automatically when Docker is absent.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles({"dev", "demo"})
@TestPropertySource(properties = {
        "app.owner.id=11111111-1111-1111-1111-111111111111",
        "app.supabase.url=https://example.supabase.co",
        "app.supabase.jwt-secret=test-secret-test-secret-test-secret-123"
})
class InventoryFlowIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired ProductService productService;
    @Autowired ProductRepository productRepository;
    @Autowired SaleService saleService;
    @Autowired StockOperationsService stockOperations;

    @Test
    void seedDataReconciles() {
        assertThat(productRepository.count()).isGreaterThanOrEqualTo(15);
        assertThat(stockOperations.reconciliation()).isEmpty();
    }

    @Test
    void failedCheckoutRollsBackEveryMovement() {
        UUID id = productService.create(new ProductRequest(null, null, "IT Widget", null, null, Product.Unit.PCS,
                new BigDecimal("10"), new BigDecimal("25"), BigDecimal.ONE, null, null, null, false, new BigDecimal("5"))).id();

        // Line 1 is fine, line 2 oversells the same product → the whole sale must roll back.
        CheckoutRequest req = new CheckoutRequest(null, List.of(
                new CartLine(SaleItem.LineType.PRODUCT, id, new BigDecimal("3"), null, null),
                new CartLine(SaleItem.LineType.PRODUCT, id, new BigDecimal("3"), null, null)),
                null, null, PaymentMethod.CASH, new BigDecimal("1000"), null, null);
        assertThatThrownBy(() -> saleService.checkout(req)).isInstanceOf(BusinessException.class);

        assertThat(productRepository.findById(id).orElseThrow().getStockOnHand()).isEqualByComparingTo("5");
        assertThat(stockOperations.reconciliation()).isEmpty();
    }

    @Test
    void checkoutAndVoidRoundTrip() {
        UUID id = productService.create(new ProductRequest(null, null, "IT Notebook", null, null, Product.Unit.PCS,
                new BigDecimal("18"), new BigDecimal("28"), BigDecimal.ONE, null, null, null, false, new BigDecimal("10"))).id();
        var sale = saleService.checkout(new CheckoutRequest(null,
                List.of(new CartLine(SaleItem.LineType.PRODUCT, id, new BigDecimal("4"), null, null)),
                null, null, PaymentMethod.GCASH, null, "REF1", null));
        assertThat(sale.total()).isEqualByComparingTo("112.00");
        assertThat(sale.costTotal()).isEqualByComparingTo("72.00");
        assertThat(productRepository.findById(id).orElseThrow().getStockOnHand()).isEqualByComparingTo("6");

        saleService.voidSale(sale.id(), "test");
        assertThat(productRepository.findById(id).orElseThrow().getStockOnHand()).isEqualByComparingTo("10");
        assertThat(stockOperations.reconciliation()).isEmpty();
    }
}
