package com.jfmprinthub.common;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Generates human-friendly, gap-tolerant document numbers from Postgres sequences. */
@Service
@RequiredArgsConstructor
public class DocumentNumberService {

    private final JdbcTemplate jdbc;

    public String nextSku(boolean material) {
        return (material ? "MAT-" : "PRD-") + next("sku_seq");
    }

    public String nextSaleNumber() {
        return "S-" + pad(next("sale_no_seq"), 6);
    }

    public String nextPoNumber() {
        return "PO-" + pad(next("po_no_seq"), 5);
    }

    public String nextJobNumber() {
        return "JO-" + pad(next("job_no_seq"), 5);
    }

    public String nextServiceCode() {
        return "SVC-" + next("service_code_seq");
    }

    private long next(String sequence) {
        Long v = jdbc.queryForObject("SELECT nextval('" + sequence + "')", Long.class);
        return v == null ? 0 : v;
    }

    private static String pad(long n, int width) {
        return String.format("%0" + width + "d", n);
    }
}
