package com.jfmprinthub.sale;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.sale.SaleDtos.CheckoutRequest;
import com.jfmprinthub.sale.SaleDtos.SaleResponse;
import com.jfmprinthub.sale.SaleDtos.SaleSummary;
import com.jfmprinthub.sale.SaleDtos.VoidRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@Tag(name = "Sales / POS")
@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService service;
    private final ReceiptPdfService receiptPdfService;

    @GetMapping
    public PageResponse<SaleSummary> list(
            @RequestParam(required = false) Sale.Status status,
            @RequestParam(required = false) Sale.Source source,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return service.search(status, source, customerId, from, to, q, page, size, sort);
    }

    @GetMapping("/{id}")
    public SaleResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SaleResponse checkout(@Valid @RequestBody CheckoutRequest request) {
        return service.checkout(request);
    }

    @PostMapping("/{id}/void")
    public SaleResponse voidSale(@PathVariable UUID id, @Valid @RequestBody VoidRequest request) {
        return service.voidSale(id, request.reason());
    }

    @GetMapping("/{id}/receipt.pdf")
    public ResponseEntity<byte[]> receipt(@PathVariable UUID id, @RequestParam(defaultValue = "80") int width,
                                          @RequestParam(defaultValue = "false") boolean download) {
        byte[] pdf = receiptPdfService.render(id, width);
        ContentDisposition cd = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename("receipt-" + id + ".pdf").build();
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString()).body(pdf);
    }
}
