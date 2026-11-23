package com.jfmprinthub.settings;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.BusinessTime;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSetMetaData;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Exports every business table as CSV inside one zip (owner-initiated backup). */
@Tag(name = "Backup")
@RestController
@RequestMapping("/api/v1/backup")
@RequiredArgsConstructor
public class BackupController {

    /** Whitelisted, ordered so a restore can follow FK dependencies. */
    static final List<String> TABLES = List.of(
            "business_settings", "site_content", "categories", "suppliers", "customers", "products", "services",
            "service_materials", "service_addons", "purchase_orders", "purchase_order_items", "supplier_payments",
            "job_orders", "job_order_items", "job_order_files", "sales", "sale_items", "payments", "stock_movements",
            "expense_categories", "expenses", "inquiries", "notifications", "audit_logs");

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping("/export")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> export() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            for (String table : TABLES) {
                zip.putNextEntry(new ZipEntry(table + ".csv"));
                OutputStreamWriter w = new OutputStreamWriter(zip, StandardCharsets.UTF_8);
                CSVPrinter printer = new CSVPrinter(w, CSVFormat.DEFAULT);
                jdbc.query("SELECT * FROM " + table, (ResultSetExtractor<Void>) rs -> {
                    try {
                        ResultSetMetaData md = rs.getMetaData();
                        for (int i = 1; i <= md.getColumnCount(); i++) printer.print(md.getColumnName(i));
                        printer.println();
                        while (rs.next()) {
                            for (int i = 1; i <= md.getColumnCount(); i++) printer.print(rs.getString(i));
                            printer.println();
                        }
                        return null;
                    } catch (IOException e) {
                        throw new IllegalStateException(e);
                    }
                });
                printer.flush();
                zip.closeEntry();
            }
            zip.putNextEntry(new ZipEntry("README.txt"));
            zip.write(("JFM PrintHub backup generated " + java.time.LocalDateTime.now(BusinessTime.ZONE) + " (Asia/Manila).\n"
                    + "One CSV per table. Timestamps are UTC. Restore in the listed order to satisfy foreign keys.\n").getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        auditService.record(AuditAction.EXPORT, "BACKUP", null, "Exported full data backup (" + TABLES.size() + " tables)");
        String name = "jfm-printhub-backup-" + BusinessTime.today() + ".zip";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .body(bytes.toByteArray());
    }
}
