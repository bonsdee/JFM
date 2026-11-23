package com.jfmprinthub.sale;

import java.util.UUID;

/** Published inside the void transaction so the job-order module can reopen a claimed job. */
public record SaleVoidedEvent(UUID saleId, UUID jobOrderId, String reason) {}
