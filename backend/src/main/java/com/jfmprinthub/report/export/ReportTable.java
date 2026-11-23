package com.jfmprinthub.report.export;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Format-agnostic tabular data used for every PDF / Excel / CSV export.
 *
 * @param totals optional footer row keyed by column key
 */
public record ReportTable(
        String title,
        String subtitle,
        List<Column> columns,
        List<Map<String, Object>> rows,
        Map<String, Object> totals
) {
    public enum Type { TEXT, MONEY, NUMBER, PERCENT, DATE, DATETIME }

    public record Column(String key, String label, Type type) {
        public static Column text(String key, String label) { return new Column(key, label, Type.TEXT); }
        public static Column money(String key, String label) { return new Column(key, label, Type.MONEY); }
        public static Column number(String key, String label) { return new Column(key, label, Type.NUMBER); }
        public static Column percent(String key, String label) { return new Column(key, label, Type.PERCENT); }
        public static Column date(String key, String label) { return new Column(key, label, Type.DATE); }
        public static Column datetime(String key, String label) { return new Column(key, label, Type.DATETIME); }
    }

    /** Small builder helper for row maps that keeps column order. */
    public static Map<String, Object> row(Object... keyValues) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) m.put((String) keyValues[i], keyValues[i + 1]);
        return m;
    }
}
