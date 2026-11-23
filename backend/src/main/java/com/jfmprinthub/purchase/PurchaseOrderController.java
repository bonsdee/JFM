package com.jfmprinthub.purchase;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.purchase.PurchaseDtos.PORequest;
import com.jfmprinthub.purchase.PurchaseDtos.POResponse;
import com.jfmprinthub.purchase.PurchaseDtos.POSummary;
import com.jfmprinthub.purchase.PurchaseDtos.PurchaseHistorySummary;
import com.jfmprinthub.purchase.PurchaseDtos.ReceiveRequest;
import com.jfmprinthub.purchase.PurchaseDtos.SuggestionCreateRequest;
import com.jfmprinthub.purchase.PurchaseDtos.SuggestionGroup;
import com.jfmprinthub.purchase.PurchaseDtos.SupplierPaymentRequest;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Tag(name = "Purchasing")
@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService service;
    private final PurchaseOrderPdfService pdfService;

    @GetMapping
    public PageResponse<POSummary> list(@RequestParam(required = false) List<PurchaseOrder.Status> status,
                                        @RequestParam(required = false) UUID supplierId,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(defaultValue = "false") boolean unpaid,
                                        @RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size,
                                        @RequestParam(required = false) String sort) {
        return service.search(status, supplierId, from, to, unpaid, q, page, size, sort);
    }

    @GetMapping("/summary")
    public PurchaseHistorySummary summary(@RequestParam(required = false) List<PurchaseOrder.Status> status,
                                          @RequestParam(required = false) UUID supplierId,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.historySummary(status, supplierId, from, to);
    }

    @GetMapping("/suggestions")
    public List<SuggestionGroup> suggestions() {
        return service.suggestions();
    }

    @PostMapping("/suggestions")
    @ResponseStatus(HttpStatus.CREATED)
    public List<POResponse> createFromSuggestions(@Valid @RequestBody SuggestionCreateRequest request) {
        return service.createFromSuggestions(request);
    }

    @GetMapping("/{id}")
    public POResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public POResponse create(@Valid @RequestBody PORequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public POResponse update(@PathVariable UUID id, @Valid @RequestBody PORequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/order")
    public POResponse order(@PathVariable UUID id) {
        return service.markOrdered(id);
    }

    @PostMapping("/{id}/receive")
    public POResponse receive(@PathVariable UUID id, @Valid @RequestBody ReceiveRequest request) {
        return service.receive(id, request);
    }

    @PostMapping("/{id}/cancel")
    public POResponse cancel(@PathVariable UUID id) {
        return service.cancel(id);
    }

    @PostMapping("/{id}/payments")
    public POResponse pay(@PathVariable UUID id, @Valid @RequestBody SupplierPaymentRequest request) {
        return service.addPayment(id, request);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("purchase-order-" + id + ".pdf").build().toString())
                .body(pdfService.render(id));
    }
}
