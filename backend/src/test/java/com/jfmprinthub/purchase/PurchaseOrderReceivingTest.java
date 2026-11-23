package com.jfmprinthub.purchase;

import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.purchase.PurchaseDtos.ReceiveLine;
import com.jfmprinthub.purchase.PurchaseDtos.ReceiveRequest;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.MovementType;
import com.jfmprinthub.stock.StockPost;
import com.jfmprinthub.stock.StockService;
import com.jfmprinthub.supplier.Supplier;
import com.jfmprinthub.supplier.SupplierRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderReceivingTest {

    @Mock PurchaseOrderRepository repository;
    @Mock SupplierRepository supplierRepository;
    @Mock ProductRepository productRepository;
    @Mock StockService stockService;
    @Mock DocumentNumberService numbers;
    @Mock AuditService auditService;

    PurchaseOrderService service;
    PurchaseOrder po;
    PurchaseOrderItem itemA;
    PurchaseOrderItem itemB;

    @BeforeEach
    void setUp() {
        service = new PurchaseOrderService(repository, supplierRepository, productRepository, stockService, numbers, auditService);
        Supplier s = new Supplier();
        s.setId(UUID.randomUUID());
        s.setName("Manila Print Supply");
        po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setPoNumber("PO-00001");
        po.setSupplier(s);
        po.setStatus(PurchaseOrder.Status.ORDERED);
        itemA = item("Tarp", "100", "6.00");
        itemB = item("Ink", "50", "1.20");
        po.getItems().addAll(List.of(itemA, itemB));
        po.setTotalAmount(new BigDecimal("660.00"));
        when(repository.findByIdForUpdate(po.getId())).thenReturn(Optional.of(po));
    }

    private PurchaseOrderItem item(String name, String qty, String cost) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setSku(name.toUpperCase());
        p.setUnit(Product.Unit.PCS);
        PurchaseOrderItem i = new PurchaseOrderItem();
        i.setId(UUID.randomUUID());
        i.setPurchaseOrder(po);
        i.setProduct(p);
        i.setQtyOrdered(new BigDecimal(qty));
        i.setUnitCost(new BigDecimal(cost));
        return i;
    }

    @SuppressWarnings("unchecked")
    @Test
    void partialReceiptPostsStockInAndSetsPartialStatus() {
        service.receive(po.getId(), new ReceiveRequest(List.of(new ReceiveLine(itemA.getId(), new BigDecimal("40"), null)), "DR 123"));

        ArgumentCaptor<List<StockPost>> captor = ArgumentCaptor.forClass(List.class);
        verify(stockService).postAll(captor.capture());
        StockPost post = captor.getValue().get(0);
        assertThat(post.type()).isEqualTo(MovementType.IN);
        assertThat(post.reason()).isEqualTo(MovementReason.PURCHASE_RECEIVED);
        assertThat(post.quantity()).isEqualByComparingTo("40");
        assertThat(post.unitCost()).isEqualByComparingTo("6.00");
        assertThat(post.referenceNo()).isEqualTo("PO-00001");
        assertThat(po.getStatus()).isEqualTo(PurchaseOrder.Status.PARTIALLY_RECEIVED);
        assertThat(itemA.getQtyReceived()).isEqualByComparingTo("40");
    }

    @Test
    void fullReceiptCompletesPoAndUsesInvoiceCost() {
        service.receive(po.getId(), new ReceiveRequest(List.of(
                new ReceiveLine(itemA.getId(), new BigDecimal("100"), new BigDecimal("6.50")),
                new ReceiveLine(itemB.getId(), new BigDecimal("50"), null)), null));

        assertThat(po.getStatus()).isEqualTo(PurchaseOrder.Status.RECEIVED);
        assertThat(po.getReceivedAt()).isNotNull();
        assertThat(itemA.getUnitCost()).isEqualByComparingTo("6.50");
        assertThat(po.getTotalAmount()).isEqualByComparingTo("710.00"); // 100×6.50 + 50×1.20
    }

    @Test
    void overReceiptIsRejectedAndNothingIsPosted() {
        assertThatThrownBy(() -> service.receive(po.getId(), new ReceiveRequest(
                List.of(new ReceiveLine(itemB.getId(), new BigDecimal("51"), null)), null)))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("OVER_RECEIPT");
        verify(stockService, never()).postAll(any());
    }

    @Test
    void cannotReceiveCancelledPo() {
        po.setStatus(PurchaseOrder.Status.CANCELLED);
        assertThatThrownBy(() -> service.receive(po.getId(), new ReceiveRequest(
                List.of(new ReceiveLine(itemA.getId(), BigDecimal.ONE, null)), null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void cancellingPartiallyReceivedPoClosesItShort() {
        itemA.setQtyReceived(new BigDecimal("40"));
        po.setStatus(PurchaseOrder.Status.PARTIALLY_RECEIVED);
        service.cancel(po.getId());
        assertThat(po.getStatus()).isEqualTo(PurchaseOrder.Status.RECEIVED);
        assertThat(po.getItems()).containsExactly(itemA);
        assertThat(po.getTotalAmount()).isEqualByComparingTo("240.00");
    }
}
