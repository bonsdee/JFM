package com.jfmprinthub.product;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.product.ProductDtos.ImportResult;
import com.jfmprinthub.product.ProductDtos.ProductOption;
import com.jfmprinthub.product.ProductDtos.ProductRequest;
import com.jfmprinthub.product.ProductDtos.ProductResponse;
import com.jfmprinthub.report.export.TableExporter;
import com.jfmprinthub.stock.StockDtos.MovementResponse;
import com.jfmprinthub.stock.StockOperationsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Tag(name = "Products")
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService service;
    private final StockOperationsService stockOperations;
    private final TableExporter exporter;

    @GetMapping
    public PageResponse<ProductResponse> list(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) UUID categoryId,
                                              @RequestParam(required = false) UUID supplierId,
                                              @RequestParam(required = false) Boolean material,
                                              @RequestParam(required = false) Product.StockStatus status,
                                              @RequestParam(defaultValue = "false") boolean archived,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size,
                                              @RequestParam(required = false) String sort) {
        return service.search(q, categoryId, supplierId, material, status, archived, page, size, sort);
    }

    @GetMapping("/options")
    public List<ProductOption> options(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) Boolean material,
                                       @RequestParam(defaultValue = "20") int limit) {
        return service.options(q, material, limit);
    }

    @GetMapping("/barcode/{code}")
    public ProductOption byBarcode(@PathVariable String code) {
        return service.byBarcode(code);
    }

    @GetMapping("/low-stock")
    public List<ProductResponse> lowStock() {
        return service.lowStock();
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping("/{id}/movements")
    public PageResponse<MovementResponse> movements(@PathVariable UUID id,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "50") int size) {
        return stockOperations.search(id, null, null, null, null, null, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable UUID id, @Valid @RequestBody ProductRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ProductResponse archive(@PathVariable UUID id) {
        return service.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    public ProductResponse restore(@PathVariable UUID id) {
        return service.setArchived(id, false);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult importCsv(@RequestPart("file") MultipartFile file) {
        return service.importCsv(file);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@RequestParam(defaultValue = "XLSX") TableExporter.Format format) {
        return exporter.respond(service.exportTable(), format, "products");
    }
}
