package com.jfmprinthub.inquiry;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.inquiry.InquiryService.InquiryResponse;
import com.jfmprinthub.inquiry.InquiryService.StatusRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Inquiries")
@RestController
@RequestMapping("/api/v1/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService service;

    @GetMapping
    public PageResponse<InquiryResponse> list(@RequestParam(required = false) List<Inquiry.Status> status,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return service.search(status, q, page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", service.unreadCount());
    }

    @PatchMapping("/{id}/status")
    public InquiryResponse status(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return service.setStatus(id, request.status());
    }
}
