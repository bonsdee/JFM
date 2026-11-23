package com.jfmprinthub.joborder;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.joborder.JobOrderDtos.CancelRequest;
import com.jfmprinthub.joborder.JobOrderDtos.ClaimRequest;
import com.jfmprinthub.joborder.JobOrderDtos.FileAttachRequest;
import com.jfmprinthub.joborder.JobOrderDtos.JobFileResponse;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderRequest;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderResponse;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderSummary;
import com.jfmprinthub.joborder.JobOrderDtos.PaymentRequest;
import com.jfmprinthub.joborder.JobOrderDtos.StatusChangeRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Job orders")
@RestController
@RequestMapping("/api/v1/job-orders")
@RequiredArgsConstructor
public class JobOrderController {

    private final JobOrderService service;
    private final JobTicketPdfService ticketPdfService;

    @GetMapping
    public PageResponse<JobOrderSummary> list(
            @RequestParam(required = false) List<JobStatus> status,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "false") boolean overdue,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return service.search(status, customerId, from, to, overdue, q, page, size, sort);
    }

    @GetMapping("/board")
    public Map<JobStatus, List<JobOrderSummary>> board() {
        return service.board();
    }

    @GetMapping("/{id}")
    public JobOrderResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobOrderResponse create(@Valid @RequestBody JobOrderRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public JobOrderResponse update(@PathVariable UUID id, @Valid @RequestBody JobOrderRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public JobOrderResponse status(@PathVariable UUID id, @Valid @RequestBody StatusChangeRequest request) {
        return service.changeStatus(id, request);
    }

    @PostMapping("/{id}/mark-printed")
    public JobOrderResponse markPrinted(@PathVariable UUID id) {
        return service.markPrinted(id);
    }

    @PostMapping("/{id}/payments")
    public JobOrderResponse pay(@PathVariable UUID id, @Valid @RequestBody PaymentRequest request) {
        return service.addPayment(id, request);
    }

    @PostMapping("/{id}/claim")
    public JobOrderResponse claim(@PathVariable UUID id, @Valid @RequestBody(required = false) ClaimRequest request) {
        return service.claim(id, request);
    }

    @PostMapping("/{id}/cancel")
    public JobOrderResponse cancel(@PathVariable UUID id, @Valid @RequestBody CancelRequest request) {
        return service.cancel(id, request.reason());
    }

    @PostMapping("/{id}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public JobFileResponse attach(@PathVariable UUID id, @Valid @RequestBody FileAttachRequest request) {
        return service.attachFile(id, request);
    }

    @DeleteMapping("/{id}/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFile(@PathVariable UUID id, @PathVariable UUID fileId) {
        service.deleteFile(id, fileId);
    }

    @GetMapping("/{id}/ticket.pdf")
    public ResponseEntity<byte[]> ticket(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("job-ticket-" + id + ".pdf").build().toString())
                .body(ticketPdfService.render(id));
    }
}
