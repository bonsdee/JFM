package com.jfmprinthub.sale;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findBySaleIdOrderByPaidAtAsc(UUID saleId);

    List<Payment> findByJobOrderIdOrderByPaidAtAsc(UUID jobOrderId);

    List<Payment> findBySaleIdIn(Collection<UUID> saleIds);
}
