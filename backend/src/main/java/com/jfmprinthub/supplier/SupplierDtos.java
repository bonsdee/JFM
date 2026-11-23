package com.jfmprinthub.supplier;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class SupplierDtos {

    private SupplierDtos() {}

    public record SupplierRequest(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 120) String contactPerson,
            @Size(max = 40) String phone,
            @Email @Size(max = 150) String email,
            String address,
            @Size(max = 80) String paymentTerms,
            String notes) {}

    public record SupplierResponse(UUID id, String name, String contactPerson, String phone, String email,
                                   String address, String paymentTerms, String notes, boolean archived,
                                   Instant createdAt) {}

    public record SupplierSummary(UUID id, String name, String contactPerson, String phone, String email,
                                  String paymentTerms, long purchaseOrders, BigDecimal totalPurchased,
                                  BigDecimal balanceDue) {}
}
