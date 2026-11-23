package com.jfmprinthub.service;

import com.jfmprinthub.service.PricingDtos.QuoteRequest;
import com.jfmprinthub.service.PricingDtos.QuoteResult;
import com.jfmprinthub.service.ServiceDtos.ServiceRequest;
import com.jfmprinthub.service.ServiceDtos.ServiceResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Services catalog")
@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceCatalogService service;
    private final PricingService pricingService;

    @GetMapping
    public List<ServiceResponse> list(@RequestParam(defaultValue = "false") boolean archived) {
        return service.list(archived);
    }

    @GetMapping("/{id}")
    public ServiceResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceResponse create(@Valid @RequestBody ServiceRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ServiceResponse update(@PathVariable UUID id, @Valid @RequestBody ServiceRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ServiceResponse archive(@PathVariable UUID id) {
        return service.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    public ServiceResponse restore(@PathVariable UUID id) {
        return service.setArchived(id, false);
    }

    /** Full quote with material requirements and cost (owner only). */
    @PostMapping("/quote")
    public QuoteResult quote(@Valid @RequestBody QuoteRequest request) {
        return pricingService.quote(request);
    }
}
