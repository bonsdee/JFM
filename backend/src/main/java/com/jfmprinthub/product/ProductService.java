package com.jfmprinthub.product;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.category.CategoryRepository;
import com.jfmprinthub.category.Category;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.ProductDtos.ImportResult;
import com.jfmprinthub.product.ProductDtos.ProductOption;
import com.jfmprinthub.product.ProductDtos.ProductRequest;
import com.jfmprinthub.product.ProductDtos.ProductResponse;
import com.jfmprinthub.report.export.ReportTable;
import com.jfmprinthub.report.export.ReportTable.Column;
import com.jfmprinthub.settings.SettingsService;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockPost;
import com.jfmprinthub.stock.StockService;
import com.jfmprinthub.supplier.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final Set<String> SORTABLE = Set.of("name", "sku", "sellingPrice", "costPrice", "stockOnHand", "createdAt", "updatedAt");

    private final ProductRepository repository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final ProductMapper mapper;
    private final StockService stockService;
    private final DocumentNumberService numbers;
    private final SettingsService settingsService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(String q, UUID categoryId, UUID supplierId, Boolean material,
                                                Product.StockStatus status, boolean archived,
                                                int page, int size, String sort) {
        var pageable = Pageables.of(page, size, sort, SORTABLE, "name", Sort.Direction.ASC);
        return PageResponse.of(repository.search(blank(q), categoryId, supplierId, material,
                status == null ? null : status.name(), archived, pageable), mapper::toResponse);
    }

    /** Lightweight list for pickers / POS / command palette. */
    @Transactional(readOnly = true)
    public List<ProductOption> options(String q, Boolean material, int limit) {
        var pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 100), Sort.by("name"));
        return repository.search(blank(q), null, null, material, null, false, pageable)
                .map(mapper::toOption).getContent();
    }

    @Transactional(readOnly = true)
    public Product entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Product", id));
    }

    @Transactional(readOnly = true)
    public ProductResponse get(UUID id) {
        return mapper.toResponse(entity(id));
    }

    @Transactional(readOnly = true)
    public ProductOption byBarcode(String code) {
        return repository.findByBarcode(code)
                .or(() -> repository.findBySkuIgnoreCase(code))
                .filter(p -> !p.isArchived())
                .map(mapper::toOption)
                .orElseThrow(() -> new NotFoundException("No product with barcode/SKU " + code));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> lowStock() {
        return repository.findLowStock().stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest r) {
        Product p = new Product();
        String sku = blank(r.sku());
        if (sku == null) {
            sku = numbers.nextSku(r.material());
        } else if (repository.existsBySkuIgnoreCase(sku)) {
            throw BusinessException.conflict("DUPLICATE_SKU", "SKU " + sku + " already exists");
        }
        p.setSku(sku.toUpperCase(Locale.ROOT));
        apply(p, r);
        if (r.reorderLevel() == null) p.setReorderLevel(settingsService.entity().getDefaultReorderLevel());
        // Seed the average cost so OUT movements before the first purchase still carry a cost.
        p.setCostPrice(Money.of(r.costPrice()));
        repository.save(p);

        if (Money.isPositive(r.initialStock())) {
            stockService.post(StockPost.in(p.getId(), MovementReason.INITIAL, r.initialStock(), r.costPrice(),
                    "PRODUCT", p.getId(), p.getSku(), "Opening balance"));
        }
        auditService.record(AuditAction.CREATE, "PRODUCT", p.getId(), "Created product " + p.getSku() + " " + p.getName());
        return mapper.toResponse(p);
    }

    @Transactional
    public ProductResponse update(UUID id, ProductRequest r) {
        Product p = entity(id);
        String sku = blank(r.sku());
        if (sku != null && !sku.equalsIgnoreCase(p.getSku())) {
            if (repository.existsBySkuIgnoreCase(sku)) throw BusinessException.conflict("DUPLICATE_SKU", "SKU " + sku + " already exists");
            p.setSku(sku.toUpperCase(Locale.ROOT));
        }
        BigDecimal oldPrice = p.getSellingPrice();
        apply(p, r);
        // Cost price is the weighted average from the ledger; only allow manual override when no stock yet.
        if (p.getStockOnHand().signum() <= 0) p.setCostPrice(Money.of(r.costPrice()));
        auditService.record(AuditAction.UPDATE, "PRODUCT", id, "Updated product " + p.getSku(),
                oldPrice.compareTo(p.getSellingPrice()) != 0
                        ? Map.of("sellingPrice", Map.of("from", oldPrice, "to", p.getSellingPrice())) : null);
        return mapper.toResponse(p);
    }

    @Transactional
    public ProductResponse setArchived(UUID id, boolean archived) {
        Product p = entity(id);
        p.setArchived(archived);
        auditService.record(archived ? AuditAction.ARCHIVE : AuditAction.RESTORE, "PRODUCT", id,
                (archived ? "Archived " : "Restored ") + p.getSku() + " " + p.getName());
        return mapper.toResponse(p);
    }

    private void apply(Product p, ProductRequest r) {
        p.setBarcode(blank(r.barcode()));
        p.setName(r.name().trim());
        p.setDescription(r.description());
        p.setCategory(r.categoryId() == null ? null : categoryRepository.findById(r.categoryId())
                .orElseThrow(() -> NotFoundException.of("Category", r.categoryId())));
        p.setUnit(r.unit());
        p.setSellingPrice(Money.of(r.sellingPrice()));
        if (r.reorderLevel() != null) p.setReorderLevel(Money.qty(r.reorderLevel()));
        p.setSupplier(r.supplierId() == null ? null : supplierRepository.findById(r.supplierId())
                .orElseThrow(() -> NotFoundException.of("Supplier", r.supplierId())));
        p.setImagePath(blank(r.imagePath()));
        p.setLocation(blank(r.location()));
        p.setMaterial(r.material());
    }

    // ---------------------------------------------------------------- import / export

    /**
     * Bulk import from CSV with header:
     * {@code sku,name,category,unit,cost_price,selling_price,reorder_level,initial_stock,barcode,location,is_material}.
     * Rows with an existing SKU are skipped. Unknown categories are created.
     */
    @Transactional
    public ImportResult importCsv(MultipartFile file) {
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true).setTrim(true).setIgnoreEmptyLines(true).build().parse(reader)) {
            for (CSVRecord rec : parser) {
                long line = rec.getRecordNumber() + 1;
                try {
                    String sku = get(rec, "sku");
                    String name = get(rec, "name");
                    if (name == null) { errors.add("Line " + line + ": name is required"); continue; }
                    if (sku != null && repository.existsBySkuIgnoreCase(sku)) { skipped++; continue; }
                    UUID categoryId = null;
                    String catName = get(rec, "category");
                    if (catName != null) {
                        categoryId = categoryRepository.findByNameIgnoreCase(catName).orElseGet(() -> {
                            Category c = new Category();
                            c.setName(catName);
                            return categoryRepository.save(c);
                        }).getId();
                    }
                    String unit = get(rec, "unit");
                    ProductRequest req = new ProductRequest(sku, get(rec, "barcode"), name, null, categoryId,
                            unit == null ? Product.Unit.PCS : Product.Unit.valueOf(unit.toUpperCase(Locale.ROOT).replace(" ", "")),
                            dec(rec, "cost_price"), dec(rec, "selling_price"),
                            get(rec, "reorder_level") == null ? null : dec(rec, "reorder_level"), null, null,
                            get(rec, "location"), "true".equalsIgnoreCase(get(rec, "is_material")) || "yes".equalsIgnoreCase(get(rec, "is_material")),
                            dec(rec, "initial_stock"));
                    create(req);
                    created++;
                } catch (Exception ex) {
                    errors.add("Line " + line + ": " + ex.getMessage());
                }
            }
        } catch (IOException e) {
            throw new BusinessException("INVALID_CSV", "Could not read CSV: " + e.getMessage());
        }
        auditService.record(AuditAction.IMPORT, "PRODUCT", null,
                "Imported products: " + created + " created, " + skipped + " skipped, " + errors.size() + " errors");
        return new ImportResult(created, skipped, errors);
    }

    @Transactional(readOnly = true)
    public ReportTable exportTable() {
        List<Map<String, Object>> rows = repository.findAllByArchivedFalseOrderByNameAsc().stream().map(p -> ReportTable.row(
                "sku", p.getSku(), "name", p.getName(),
                "category", p.getCategory() != null ? p.getCategory().getName() : "",
                "unit", p.getUnit().name(), "type", p.isMaterial() ? "Material" : "Retail",
                "cost", p.getCostPrice(), "price", p.getSellingPrice(), "stock", p.getStockOnHand(),
                "reorder", p.getReorderLevel(), "value", Money.of(p.getStockOnHand().max(BigDecimal.ZERO).multiply(p.getCostPrice())),
                "supplier", p.getSupplier() != null ? p.getSupplier().getName() : "",
                "location", p.getLocation(), "barcode", p.getBarcode())).toList();
        BigDecimal total = rows.stream().map(r -> (BigDecimal) r.get("value")).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ReportTable("Products", rows.size() + " active products",
                List.of(Column.text("sku", "SKU"), Column.text("name", "Name"), Column.text("category", "Category"),
                        Column.text("unit", "Unit"), Column.text("type", "Type"), Column.money("cost", "Avg Cost"),
                        Column.money("price", "Price"), Column.number("stock", "On Hand"), Column.number("reorder", "Reorder Lvl"),
                        Column.money("value", "Stock Value"), Column.text("supplier", "Supplier"),
                        Column.text("location", "Location"), Column.text("barcode", "Barcode")),
                rows, Map.of("name", "TOTAL", "value", total));
    }

    private static String get(CSVRecord rec, String col) {
        if (!rec.isMapped(col)) return null;
        String v = rec.get(col);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static BigDecimal dec(CSVRecord rec, String col) {
        String v = get(rec, col);
        return v == null ? BigDecimal.ZERO : new BigDecimal(v.replace(",", "").replace("₱", ""));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
