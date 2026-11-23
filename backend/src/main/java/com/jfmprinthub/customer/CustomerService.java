package com.jfmprinthub.customer;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.common.Pageables;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.customer.CustomerDtos.CustomerDetail;
import com.jfmprinthub.customer.CustomerDtos.CustomerRequest;
import com.jfmprinthub.customer.CustomerDtos.CustomerResponse;
import com.jfmprinthub.customer.CustomerDtos.HistoryEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository repository;
    private final CustomerMapper mapper;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> search(String q, boolean archived, int page, int size, String sort) {
        var pageable = Pageables.of(page, size, sort, Set.of("name", "createdAt"), "name", Sort.Direction.ASC);
        String term = q == null || q.isBlank() ? null : q.trim();
        return PageResponse.of(repository.search(term, archived, pageable), mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Customer entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Customer", id));
    }

    /** Customer profile with combined sales + job order history and outstanding job balances. */
    @Transactional(readOnly = true)
    public CustomerDetail detail(UUID id) {
        Customer c = entity(id);
        List<HistoryEntry> history = jdbc.query("""
                SELECT 'SALE' AS type, id, sale_number AS number, status, total, 0::numeric AS balance, sold_at AS date
                  FROM sales WHERE customer_id = ?
                UNION ALL
                SELECT 'JOB_ORDER', id, job_number, status, total,
                       CASE WHEN status IN ('CANCELLED', 'CLAIMED') THEN 0 ELSE total - amount_paid END, created_at
                  FROM job_orders WHERE customer_id = ?
                ORDER BY date DESC LIMIT 100
                """, (rs, i) -> new HistoryEntry(rs.getString("type"), rs.getObject("id", UUID.class),
                rs.getString("number"), rs.getString("status"), rs.getBigDecimal("total"),
                rs.getBigDecimal("balance"), rs.getTimestamp("date").toInstant()), id, id);

        BigDecimal spend = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total), 0) FROM sales WHERE customer_id = ? AND status = 'COMPLETED'", BigDecimal.class, id);
        BigDecimal outstanding = jdbc.queryForObject("""
                SELECT COALESCE(SUM(total - amount_paid), 0) FROM job_orders
                 WHERE customer_id = ? AND status NOT IN ('CANCELLED', 'CLAIMED')
                """, BigDecimal.class, id);
        long sales = history.stream().filter(h -> h.type().equals("SALE")).count();
        long jobs = history.size() - sales;
        return new CustomerDetail(mapper.toResponse(c), spend, outstanding, sales, jobs, history);
    }

    @Transactional
    public CustomerResponse create(CustomerRequest r) {
        Customer c = new Customer();
        mapper.update(r, c);
        repository.save(c);
        auditService.record(AuditAction.CREATE, "CUSTOMER", c.getId(), "Created customer " + c.getName());
        return mapper.toResponse(c);
    }

    @Transactional
    public CustomerResponse update(UUID id, CustomerRequest r) {
        Customer c = entity(id);
        mapper.update(r, c);
        auditService.record(AuditAction.UPDATE, "CUSTOMER", id, "Updated customer " + c.getName());
        return mapper.toResponse(c);
    }

    @Transactional
    public CustomerResponse setArchived(UUID id, boolean archived) {
        Customer c = entity(id);
        c.setArchived(archived);
        auditService.record(archived ? AuditAction.ARCHIVE : AuditAction.RESTORE, "CUSTOMER", id,
                (archived ? "Archived" : "Restored") + " customer " + c.getName());
        return mapper.toResponse(c);
    }
}
