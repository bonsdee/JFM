package com.jfmprinthub.report;

import com.jfmprinthub.report.export.TableExporter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Report types: sales, profit-loss, inventory-valuation, stock-movements, best-sellers (order=best|worst),
 * services-performance, purchases, low-stock, expenses, cash-closing (uses {@code to} as the day).
 */
@Tag(name = "Reports")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final TableExporter exporter;

    @GetMapping("/{type}")
    public ReportResult report(@PathVariable String type,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                               @RequestParam(required = false) ReportService.GroupBy groupBy,
                               @RequestParam(required = false) String order) {
        return reportService.run(type, from, to, groupBy, order);
    }

    @GetMapping("/{type}/export")
    public ResponseEntity<byte[]> export(@PathVariable String type,
                                         @RequestParam(defaultValue = "PDF") TableExporter.Format format,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                         @RequestParam(required = false) ReportService.GroupBy groupBy,
                                         @RequestParam(required = false) String order) {
        ReportResult r = reportService.run(type, from, to, groupBy, order);
        return exporter.respond(r.table(), format, "jfm-" + type);
    }
}
