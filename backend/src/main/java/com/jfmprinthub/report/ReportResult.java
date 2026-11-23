package com.jfmprinthub.report;

import com.jfmprinthub.report.export.ReportTable;

import java.util.List;
import java.util.Map;

/**
 * Every report returns: headline summary numbers, chart-ready series and an exportable table.
 */
public record ReportResult(
        String type,
        String title,
        String period,
        Map<String, Object> summary,
        List<Map<String, Object>> chart,
        ReportTable table
) {}
