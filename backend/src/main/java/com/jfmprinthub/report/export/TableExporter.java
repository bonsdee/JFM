package com.jfmprinthub.report.export;

import com.jfmprinthub.common.BusinessTime;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/** Renders a {@link ReportTable} to CSV, Excel (.xlsx) or PDF. */
@Component
public class TableExporter {

    public enum Format { PDF, XLSX, CSV }

    private static final DecimalFormat PESO = new DecimalFormat("₱#,##0.00");
    private static final DecimalFormat NUM = new DecimalFormat("#,##0.###");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("MMM d, yyyy");
    private static final DateTimeFormatter DATETIME = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a");
    private static final Color INDIGO = new Color(99, 102, 241);
    private static final Color SLATE = new Color(30, 41, 59);
    private static final Color ROW_ALT = new Color(248, 250, 252);

    public ResponseEntity<byte[]> respond(ReportTable table, Format format, String baseFileName) {
        byte[] body;
        MediaType type;
        String ext;
        switch (format) {
            case PDF -> { body = pdf(table); type = MediaType.APPLICATION_PDF; ext = "pdf"; }
            case XLSX -> {
                body = xlsx(table);
                type = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                ext = "xlsx";
            }
            default -> { body = csv(table); type = MediaType.parseMediaType("text/csv; charset=UTF-8"); ext = "csv"; }
        }
        String fileName = baseFileName + "-" + BusinessTime.today() + "." + ext;
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(body);
    }

    public byte[] csv(ReportTable t) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter w = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVPrinter printer = new CSVPrinter(w, CSVFormat.DEFAULT)) {
            out.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF}); // BOM so Excel reads UTF-8 (₱)
            printer.printRecord(t.columns().stream().map(ReportTable.Column::label).toList());
            for (Map<String, Object> row : t.rows()) {
                printer.printRecord(t.columns().stream().map(c -> raw(row.get(c.key()))).toList());
            }
            if (t.totals() != null && !t.totals().isEmpty()) {
                printer.printRecord(t.columns().stream().map(c -> raw(t.totals().get(c.key()))).toList());
            }
            printer.flush();
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("CSV export failed", e);
        }
    }

    public byte[] xlsx(ReportTable t) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(safeSheetName(t.title()));
            var fmt = wb.createDataFormat();

            var titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            CellStyle titleStyle = wb.createCellStyle();
            titleStyle.setFont(titleFont);

            var headFont = wb.createFont();
            headFont.setBold(true);
            headFont.setColor(IndexedColors.WHITE.getIndex());
            CellStyle head = wb.createCellStyle();
            head.setFont(headFont);
            head.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            head.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            head.setBorderBottom(BorderStyle.THIN);

            CellStyle money = wb.createCellStyle();
            money.setDataFormat(fmt.getFormat("\"₱\"#,##0.00"));
            CellStyle number = wb.createCellStyle();
            number.setDataFormat(fmt.getFormat("#,##0.###"));
            CellStyle percent = wb.createCellStyle();
            percent.setDataFormat(fmt.getFormat("0.00\"%\""));
            CellStyle date = wb.createCellStyle();
            date.setDataFormat(fmt.getFormat("mmm d, yyyy"));
            CellStyle datetime = wb.createCellStyle();
            datetime.setDataFormat(fmt.getFormat("mmm d, yyyy h:mm AM/PM"));
            var boldFont = wb.createFont();
            boldFont.setBold(true);

            int r = 0;
            Cell tc = sheet.createRow(r++).createCell(0);
            tc.setCellValue(t.title());
            tc.setCellStyle(titleStyle);
            if (t.subtitle() != null) sheet.createRow(r++).createCell(0).setCellValue(t.subtitle());
            r++;

            Row header = sheet.createRow(r++);
            for (int i = 0; i < t.columns().size(); i++) {
                Cell c = header.createCell(i);
                c.setCellValue(t.columns().get(i).label());
                c.setCellStyle(head);
            }
            for (Map<String, Object> rowData : t.rows()) {
                writeXlsxRow(sheet.createRow(r++), t.columns(), rowData, money, number, percent, date, datetime);
            }
            if (t.totals() != null && !t.totals().isEmpty()) {
                Row tr = sheet.createRow(r);
                writeXlsxRow(tr, t.columns(), t.totals(), money, number, percent, date, datetime);
                for (Cell c : tr) {
                    CellStyle s = wb.createCellStyle();
                    s.cloneStyleFrom(c.getCellStyle());
                    s.setFont(boldFont);
                    s.setBorderTop(BorderStyle.THIN);
                    c.setCellStyle(s);
                }
            }
            for (int i = 0; i < t.columns().size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 512, 60 * 256));
            }
            sheet.createFreezePane(0, t.subtitle() != null ? 4 : 3);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Excel export failed", e);
        }
    }

    private void writeXlsxRow(Row row, List<ReportTable.Column> cols, Map<String, Object> data, CellStyle money,
                              CellStyle number, CellStyle percent, CellStyle date, CellStyle datetime) {
        for (int i = 0; i < cols.size(); i++) {
            ReportTable.Column col = cols.get(i);
            Object v = data.get(col.key());
            Cell c = row.createCell(i);
            if (v == null) continue;
            if (v instanceof Number n && col.type() != ReportTable.Type.TEXT) {
                c.setCellValue(n.doubleValue());
                c.setCellStyle(switch (col.type()) {
                    case MONEY -> money;
                    case PERCENT -> percent;
                    default -> number;
                });
            } else if (v instanceof LocalDate d) {
                c.setCellValue(d);
                c.setCellStyle(date);
            } else if (v instanceof Instant inst) {
                c.setCellValue(LocalDateTime.ofInstant(inst, BusinessTime.ZONE));
                c.setCellStyle(datetime);
            } else {
                c.setCellValue(String.valueOf(v));
            }
        }
    }

    public byte[] pdf(ReportTable t) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            boolean landscape = t.columns().size() > 6;
            Document doc = new Document(landscape ? PageSize.A4.rotate() : PageSize.A4, 32, 32, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD, SLATE);
            Font subFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);
            Font headFont = new Font(Font.HELVETICA, 8.5f, Font.BOLD, Color.WHITE);
            Font cellFont = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, SLATE);
            Font totalFont = new Font(Font.HELVETICA, 8.5f, Font.BOLD, SLATE);

            doc.add(new Paragraph(t.title(), titleFont));
            String generated = "Generated " + DATETIME.format(LocalDateTime.now(BusinessTime.ZONE));
            doc.add(new Paragraph((t.subtitle() != null ? t.subtitle() + "  •  " : "") + generated, subFont));
            doc.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(t.columns().size());
            table.setWidthPercentage(100);
            table.setHeaderRows(1);
            for (ReportTable.Column c : t.columns()) {
                PdfPCell cell = new PdfPCell(new Phrase(c.label(), headFont));
                cell.setBackgroundColor(INDIGO);
                cell.setBorder(0);
                cell.setPadding(5);
                cell.setHorizontalAlignment(isNumeric(c) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                table.addCell(cell);
            }
            int i = 0;
            for (Map<String, Object> row : t.rows()) {
                Color bg = (i++ % 2 == 1) ? ROW_ALT : Color.WHITE;
                for (ReportTable.Column c : t.columns()) {
                    PdfPCell cell = new PdfPCell(new Phrase(display(c, row.get(c.key())), cellFont));
                    cell.setBackgroundColor(bg);
                    cell.setBorder(0);
                    cell.setPadding(4);
                    cell.setHorizontalAlignment(isNumeric(c) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                    table.addCell(cell);
                }
            }
            if (t.totals() != null && !t.totals().isEmpty()) {
                for (ReportTable.Column c : t.columns()) {
                    PdfPCell cell = new PdfPCell(new Phrase(display(c, t.totals().get(c.key())), totalFont));
                    cell.setBorder(PdfPCell.TOP);
                    cell.setPadding(5);
                    cell.setHorizontalAlignment(isNumeric(c) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                    table.addCell(cell);
                }
            }
            if (t.rows().isEmpty()) {
                PdfPCell empty = new PdfPCell(new Phrase("No data for the selected period", cellFont));
                empty.setColspan(t.columns().size());
                empty.setPadding(12);
                empty.setBorder(0);
                empty.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(empty);
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("PDF export failed", e);
        }
    }

    private static boolean isNumeric(ReportTable.Column c) {
        return c.type() == ReportTable.Type.MONEY || c.type() == ReportTable.Type.NUMBER || c.type() == ReportTable.Type.PERCENT;
    }

    static String display(ReportTable.Column c, Object v) {
        if (v == null) return "";
        if (v instanceof Number n) {
            return switch (c.type()) {
                case MONEY -> PESO.format(toBig(n));
                case PERCENT -> NUM.format(toBig(n)) + "%";
                case NUMBER -> NUM.format(toBig(n));
                default -> String.valueOf(v);
            };
        }
        if (v instanceof LocalDate d) return DATE.format(d);
        if (v instanceof Instant i) return DATETIME.format(LocalDateTime.ofInstant(i, BusinessTime.ZONE));
        return String.valueOf(v);
    }

    private static Object raw(Object v) {
        if (v instanceof Instant i) return DATETIME.format(LocalDateTime.ofInstant(i, BusinessTime.ZONE));
        if (v instanceof BigDecimal b) return b.toPlainString();
        return v == null ? "" : v;
    }

    private static BigDecimal toBig(Number n) {
        return n instanceof BigDecimal b ? b : new BigDecimal(n.toString());
    }

    private static String safeSheetName(String s) {
        String clean = s == null ? "Report" : s.replaceAll("[\\\\/?*\\[\\]:]", " ");
        return clean.length() > 31 ? clean.substring(0, 31) : clean;
    }
}
