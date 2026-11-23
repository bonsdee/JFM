package com.jfmprinthub.customer;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.customer.CustomerDtos.CustomerDetail;
import com.jfmprinthub.customer.CustomerDtos.CustomerRequest;
import com.jfmprinthub.customer.CustomerDtos.CustomerResponse;
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

import java.util.UUID;

@Tag(name = "Customers")
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService service;

    @GetMapping
    public PageResponse<CustomerResponse> list(@RequestParam(required = false) String q,
                                               @RequestParam(defaultValue = "false") boolean archived,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String sort) {
        return service.search(q, archived, page, size, sort);
    }

    @GetMapping("/{id}")
    public CustomerDetail get(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CustomerRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public CustomerResponse update(@PathVariable UUID id, @Valid @RequestBody CustomerRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public CustomerResponse archive(@PathVariable UUID id) {
        return service.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    public CustomerResponse restore(@PathVariable UUID id) {
        return service.setArchived(id, false);
    }
}
