package com.jfmprinthub.sale;

import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.sale.SaleDtos.SaleResponse;
import com.jfmprinthub.settings.BusinessSettings;
import com.jfmprinthub.settings.SettingsService;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Thermal-printer friendly receipt PDF (58mm or 80mm roll width, auto height).
 * 1 mm = 2.835 pt.
 */
@Service
@RequiredArgsConstructor
public class ReceiptPdfService {

    private static final DecimalFormat PESO = new DecimalFormat("#,##0.00");
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a");

    private final SaleService saleService;
    private final SettingsService settingsService;

    @Transactional(readOnly = true)
    public byte[] render(UUID saleId, int widthMm) {
        SaleResponse sale = saleService.get(saleId);
        BusinessSettings biz = settingsService.entity();
        float width = (widthMm <= 58 ? 58 : 80) * 2.835f;
        float margin = 8;
        // Estimate height: header + lines + totals; thermal printers cut wherever the content ends.
        float height = 300 + sale.items().size() * 34f + sale.payments().size() * 14f;
        float base = widthMm <= 58 ? 7f : 8f;

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(new Rectangle(width, height), margin, margin, 10, 10);
            PdfWriter.getInstance(doc, out);
            doc.open();
            Font bold = new Font(Font.COURIER, base + 2, Font.BOLD);
            Font normal = new Font(Font.COURIER, base);
            Font small = new Font(Font.COURIER, base - 1);
            Font totalFont = new Font(Font.COURIER, base + 2, Font.BOLD);

            String header = biz.getReceiptHeader() != null && !biz.getReceiptHeader().isBlank()
                    ? biz.getReceiptHeader() : biz.getBusinessName();
            boolean first = true;
            for (String line : header.split("\\R")) {
                center(doc, line, first ? bold : normal);
                first = false;
            }
            if (biz.getAddress() != null) center(doc, biz.getAddress(), small);
            if (biz.getPhone() != null) center(doc, biz.getPhone(), small);
            if (biz.getTin() != null && !biz.getTin().isBlank()) center(doc, "TIN: " + biz.getTin(), small);
            rule(doc);

            doc.add(new Paragraph("Receipt #: " + sale.saleNumber(), normal));
            doc.add(new Paragraph("Date: " + DT.format(sale.soldAt().atZone(BusinessTime.ZONE)), normal));
            doc.add(new Paragraph("Customer: " + sale.customerName(), normal));
            if (sale.status() == Sale.Status.VOIDED) center(doc, "*** VOIDED ***", bold);
            rule(doc);

            PdfPTable items = new PdfPTable(new float[]{3.2f, 1.4f});
            items.setWidthPercentage(100);
            for (var i : sale.items()) {
                cell(items, i.description(), normal, Element.ALIGN_LEFT, 2);
                cell(items, "  " + qty(i.quantity()) + " x " + PESO.format(i.unitPrice()), small, Element.ALIGN_LEFT, 1);
                cell(items, PESO.format(i.lineTotal()), normal, Element.ALIGN_RIGHT, 1);
            }
            doc.add(items);
            rule(doc);

            PdfPTable totals = new PdfPTable(new float[]{2.2f, 1.6f});
            totals.setWidthPercentage(100);
            row(totals, "Subtotal", sale.subtotal(), normal);
            if (sale.discountAmount() != null && sale.discountAmount().signum() > 0) {
                String label = sale.discountType() == Sale.DiscountType.PERCENT
                        ? "Discount (" + sale.discountValue().stripTrailingZeros().toPlainString() + "%)" : "Discount";
                row(totals, label, sale.discountAmount().negate(), normal);
            }
            if (biz.isVatEnabled() && sale.taxAmount() != null && sale.taxAmount().signum() > 0) {
                row(totals, biz.isVatInclusive() ? "VAT (incl.)" : "VAT", sale.taxAmount(), normal);
            }
            row(totals, "TOTAL", sale.total(), totalFont);
            for (var p : sale.payments()) row(totals, p.method().name().replace('_', ' '), p.amount(), normal);
            if (sale.changeDue() != null && sale.changeDue().signum() > 0) {
                row(totals, "Tendered", sale.amountTendered(), normal);
                row(totals, "Change", sale.changeDue(), bold);
            }
            doc.add(totals);
            rule(doc);

            String footer = biz.getReceiptFooter() == null ? "Thank you!" : biz.getReceiptFooter();
            for (String line : footer.split("\\R")) center(doc, line, small);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Receipt rendering failed", e);
        }
    }

    private static void center(Document doc, String text, Font f) throws Exception {
        Paragraph p = new Paragraph(text, f);
        p.setAlignment(Element.ALIGN_CENTER);
        doc.add(p);
    }

    private static void rule(Document doc) throws Exception {
        LineSeparator ls = new LineSeparator(0.5f, 100, null, Element.ALIGN_CENTER, -2);
        doc.add(new Paragraph(" ", new Font(Font.COURIER, 3)));
        doc.add(ls);
        doc.add(new Paragraph(" ", new Font(Font.COURIER, 4)));
    }

    private static void cell(PdfPTable t, String text, Font f, int align, int colspan) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBorder(0);
        c.setHorizontalAlignment(align);
        c.setColspan(colspan);
        c.setPaddingTop(1);
        c.setPaddingBottom(1);
        t.addCell(c);
    }

    private static void row(PdfPTable t, String label, BigDecimal value, Font f) {
        cell(t, label, f, Element.ALIGN_LEFT, 1);
        cell(t, "P" + PESO.format(value), f, Element.ALIGN_RIGHT, 1);
    }

    private static String qty(BigDecimal q) {
        return q.stripTrailingZeros().toPlainString();
    }
}
