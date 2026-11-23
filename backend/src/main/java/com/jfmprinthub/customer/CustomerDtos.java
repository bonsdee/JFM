package com.jfmprinthub.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CustomerDtos {

    private CustomerDtos() {}

    public record CustomerRequest(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 40) String phone,
            @Email @Size(max = 150) String email,
            @Size(max = 150) String facebookName,
            String notes) {}

    public record CustomerResponse(UUID id, String name, String phone, String email, String facebookName,
                                   String notes, boolean archived, Instant createdAt) {}

    public record HistoryEntry(String type, UUID id, String number, String status, BigDecimal total,
                               BigDecimal balance, Instant date) {}

    public record CustomerDetail(CustomerResponse customer, BigDecimal lifetimeSpend, BigDecimal outstandingBalance,
                                 long salesCount, long jobCount, List<HistoryEntry> history) {}
}
