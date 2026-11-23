package com.jfmprinthub.service;

import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.service.PricingDtos.AddonSelection;
import com.jfmprinthub.service.PricingDtos.PaperSize;
import com.jfmprinthub.service.PricingDtos.QuoteRequest;
import com.jfmprinthub.service.PricingDtos.QuoteResult;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockPost;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The pricing engine is shared by landing page, POS and job orders — these numbers must never drift. */
class PricingServiceTest {

    PricingService pricing;

    @BeforeEach
    void setUp() {
        pricing = new PricingService(Mockito.mock(CatalogServiceRepository.class));
    }

    private static CatalogService tarp() {
        CatalogService s = new CatalogService();
        s.setId(UUID.randomUUID());
        s.setName("Tarpaulin Printing");
        s.setPricingModel(PricingModel.PER_SQFT);
        s.setRate(new BigDecimal("15.00"));
        s.setMinCharge(new BigDecimal("150.00"));
        s.setRushFeePercent(new BigDecimal("25"));
        s.setUnitLabel("per sq ft");

        Product tarp = material("Tarpaulin 13oz", "6.00", "500");
        Product ink = material("Eco ink", "1.20", "1000");
        s.getMaterials().add(bom(s, tarp, "1"));
        s.getMaterials().add(bom(s, ink, "3"));

        ServiceAddon eyelet = new ServiceAddon();
        eyelet.setId(UUID.fromString("00000000-0000-0000-0000-0000000000e1"));
        eyelet.setService(s);
        eyelet.setName("Eyelets");
        eyelet.setChargeType(ServiceAddon.ChargeType.PER_PIECE);
        eyelet.setAmount(new BigDecimal("5.00"));
        s.getAddons().add(eyelet);
        ServiceAddon layout = new ServiceAddon();
        layout.setId(UUID.fromString("00000000-0000-0000-0000-0000000000e2"));
        layout.setService(s);
        layout.setName("Layout");
        layout.setChargeType(ServiceAddon.ChargeType.FIXED);
        layout.setAmount(new BigDecimal("100.00"));
        s.getAddons().add(layout);
        return s;
    }

    private static Product material(String name, String cost, String stock) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setSku("MAT-" + name.hashCode());
        p.setName(name);
        p.setUnit(Product.Unit.SQFT);
        p.setCostPrice(new BigDecimal(cost));
        p.setStockOnHand(new BigDecimal(stock));
        return p;
    }

    private static ServiceMaterial bom(CatalogService s, Product p, String perUnit) {
        ServiceMaterial m = new ServiceMaterial();
        m.setService(s);
        m.setProduct(p);
        m.setQtyPerUnit(new BigDecimal(perUnit));
        return m;
    }

    private static QuoteRequest tarpReq(String w, String h, String qty, boolean rush, List<AddonSelection> addons) {
        return new QuoteRequest(null, "tarpaulin", new BigDecimal(qty), new BigDecimal(w), new BigDecimal(h), null,
                false, null, rush, addons, null);
    }

    @Test
    void tarpaulinPerSquareFoot() {
        QuoteResult q = pricing.calculate(tarp(), tarpReq("3", "5", "1", false, null));
        assertThat(q.baseAmount()).isEqualByComparingTo("225.00");
        assertThat(q.total()).isEqualByComparingTo("225.00");
        assertThat(q.billableUnits()).isEqualByComparingTo("15");
        assertThat(q.minimumApplied()).isFalse();
    }

    @Test
    void tarpaulinMinimumChargeAppliesPerPiece() {
        QuoteResult q = pricing.calculate(tarp(), tarpReq("2", "3", "2", false, null)); // 6 sqft × 15 = 90 < 150
        assertThat(q.minimumApplied()).isTrue();
        assertThat(q.total()).isEqualByComparingTo("300.00");
        assertThat(q.unitPrice()).isEqualByComparingTo("150.00");
        assertThat(q.billableUnits()).isEqualByComparingTo("12");
    }

    @Test
    void addonsAndRushFee() {
        var addons = List.of(new AddonSelection(UUID.fromString("00000000-0000-0000-0000-0000000000e1"), new BigDecimal("4")),
                new AddonSelection(UUID.fromString("00000000-0000-0000-0000-0000000000e2"), null));
        QuoteResult q = pricing.calculate(tarp(), tarpReq("3", "5", "1", true, addons));
        // base 225 + eyelets 4×5=20 + layout 100 = 345; rush 25% = 86.25 → 431.25
        assertThat(q.rushFee()).isEqualByComparingTo("86.25");
        assertThat(q.total()).isEqualByComparingTo("431.25");
        assertThat(q.addons()).hasSize(2);
    }

    @Test
    void billOfMaterialsScalesWithArea() {
        QuoteResult q = pricing.calculate(tarp(), tarpReq("4", "6", "2", false, null)); // 48 sqft
        assertThat(q.materials()).hasSize(2);
        assertThat(q.materials().get(0).quantity()).isEqualByComparingTo("48");
        assertThat(q.materials().get(1).quantity()).isEqualByComparingTo("144");
        // 48 × 6.00 + 144 × 1.20 = 288 + 172.80
        assertThat(q.materialCost()).isEqualByComparingTo("460.80");

        List<StockPost> posts = pricing.consumptionPosts(tarp(), q.billableUnits(), MovementReason.JOB_CONSUMPTION, "JOB_ORDER", null, "JO-1");
        assertThat(posts).allMatch(p -> p.quantity().signum() < 0);
    }

    @Test
    void perPageColoredLongPaper() {
        CatalogService s = new CatalogService();
        s.setName("Document Printing");
        s.setPricingModel(PricingModel.PER_PAGE);
        s.setRate(new BigDecimal("3.00"));
        s.setColorRate(new BigDecimal("10.00"));
        s.setLongSurcharge(new BigDecimal("1.00"));
        QuoteRequest r = new QuoteRequest(null, null, new BigDecimal("2"), null, null, 12, true, PaperSize.LONG, false, null, null);
        QuoteResult q = pricing.calculate(s, r);
        // 12 pages × 2 copies × (10 + 1) = 264
        assertThat(q.total()).isEqualByComparingTo("264.00");
        assertThat(q.billableUnits()).isEqualByComparingTo("24");
    }

    @Test
    void perPieceRoundsUpToBatches() {
        CatalogService s = new CatalogService();
        s.setName("Business Cards");
        s.setPricingModel(PricingModel.PER_PIECE);
        s.setRate(new BigDecimal("350.00"));
        s.setPiecesPerBatch(100);
        QuoteResult q = pricing.calculate(s, new QuoteRequest(null, null, new BigDecimal("150"), null, null, null, false, null, false, null, null));
        assertThat(q.total()).isEqualByComparingTo("700.00"); // 2 batches
    }

    @Test
    void fixedPackage() {
        CatalogService s = new CatalogService();
        s.setName("ID Photo");
        s.setPricingModel(PricingModel.FIXED);
        s.setBasePrice(new BigDecimal("80.00"));
        QuoteResult q = pricing.calculate(s, new QuoteRequest(null, null, new BigDecimal("3"), null, null, null, false, null, false, null, null));
        assertThat(q.total()).isEqualByComparingTo("240.00");
    }

    @Test
    void validationErrors() {
        assertThatThrownBy(() -> pricing.calculate(tarp(), new QuoteRequest(null, null, BigDecimal.ONE, null, null, null, false, null, false, null, null)))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("SIZE_REQUIRED");
        assertThatThrownBy(() -> pricing.calculate(tarp(), tarpReq("3", "5", "1", false,
                List.of(new AddonSelection(UUID.randomUUID(), null)))))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("INVALID_ADDON");
    }
}
