package com.jfmprinthub.supplier;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.supplier.SupplierDtos.SupplierRequest;
import com.jfmprinthub.supplier.SupplierDtos.SupplierResponse;
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

@Tag(name = "Suppliers")
@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService service;

    @GetMapping
    public PageResponse<SupplierResponse> list(@RequestParam(required = false) String q,
                                               @RequestParam(defaultValue = "false") boolean archived,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String sort) {
        return service.search(q, archived, page, size, sort);
    }

    @GetMapping("/{id}")
    public SupplierResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable UUID id, @Valid @RequestBody SupplierRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public SupplierResponse archive(@PathVariable UUID id) {
        return service.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    public SupplierResponse restore(@PathVariable UUID id) {
        return service.setArchived(id, false);
    }
}
