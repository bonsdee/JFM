package com.jfmprinthub.purchase;

import com.jfmprinthub.purchase.PurchaseDtos.POResponse;
import com.jfmprinthub.settings.BusinessSettings;
import com.jfmprinthub.settings.SettingsService;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/** Printable purchase order to send to the supplier. */
@Service
@RequiredArgsConstructor
public class PurchaseOrderPdfService {

    private static final DecimalFormat PESO = new DecimalFormat("#,##0.00");
    private static final DecimalFormat QTY = new DecimalFormat("#,##0.###");
    private static final DateTimeFormatter D = DateTimeFormatter.ofPattern("MMMM d, yyyy");
    private static final Color INDIGO = new Color(99, 102, 241);

    private final PurchaseOrderService service;
    private final SettingsService settingsService;

    @Transactional(readOnly = true)
    public byte[] render(UUID id) {
        POResponse po = service.get(id);
        BusinessSettings biz = settingsService.entity();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, out);
            doc.open();
            Font title = new Font(Font.HELVETICA, 20, Font.BOLD, INDIGO);
            Font h = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font body = new Font(Font.HELVETICA, 9.5f);
            Font muted = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);

            PdfPTable top = new PdfPTable(new float[]{1.3f, 1});
            top.setWidthPercentage(100);
            PdfPCell left = new PdfPCell();
            left.setBorder(0);
            left.addElement(new Paragraph(biz.getBusinessName(), h));
            if (biz.getAddress() != null) left.addElement(new Paragraph(biz.getAddress(), muted));
            if (biz.getPhone() != null) left.addElement(new Paragraph(biz.getPhone(), muted));
            if (biz.getEmail() != null) left.addElement(new Paragraph(biz.getEmail(), muted));
            top.addCell(left);
            PdfPCell right = new PdfPCell();
            right.setBorder(0);
            Paragraph t = new Paragraph("PURCHASE ORDER", title);
            t.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(t);
            Paragraph num = new Paragraph(po.poNumber() + "  •  " + po.status(), h);
            num.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(num);
            if (po.orderDate() != null) {
                Paragraph d = new Paragraph("Order date: " + D.format(po.orderDate()), muted);
                d.setAlignment(Element.ALIGN_RIGHT);
                right.addElement(d);
            }
            if (po.expectedDate() != null) {
                Paragraph d = new Paragraph("Expected: " + D.format(po.expectedDate()), muted);
                d.setAlignment(Element.ALIGN_RIGHT);
                right.addElement(d);
            }
            top.addCell(right);
            doc.add(top);
            doc.add(new Paragraph(" "));

            doc.add(new Paragraph("SUPPLIER", muted));
            doc.add(new Paragraph(po.supplierName(), h));
            if (po.supplierPhone() != null) doc.add(new Paragraph(po.supplierPhone(), body));
            if (po.supplierEmail() != null) doc.add(new Paragraph(po.supplierEmail(), body));
            doc.add(new Paragraph(" "));

            PdfPTable items = new PdfPTable(new float[]{1.2f, 3.5f, 1, 1.2f, 1.4f});
            items.setWidthPercentage(100);
            for (String head : new String[]{"SKU", "Item", "Qty", "Unit cost", "Amount"}) {
                PdfPCell c = new PdfPCell(new Phrase(head, new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE)));
                c.setBackgroundColor(INDIGO);
                c.setBorder(0);
                c.setPadding(6);
                items.addCell(c);
            }
            for (var i : po.items()) {
                cell(items, i.sku(), body, Element.ALIGN_LEFT);
                cell(items, i.productName(), body, Element.ALIGN_LEFT);
                cell(items, QTY.format(i.qtyOrdered()) + " " + i.unit().toLowerCase(), body, Element.ALIGN_RIGHT);
                cell(items, "P" + PESO.format(i.unitCost()), body, Element.ALIGN_RIGHT);
                cell(items, "P" + PESO.format(i.lineTotal()), body, Element.ALIGN_RIGHT);
            }
            PdfPCell label = new PdfPCell(new Phrase("TOTAL", h));
            label.setColspan(4);
            label.setBorder(0);
            label.setHorizontalAlignment(Element.ALIGN_RIGHT);
            label.setPadding(6);
            items.addCell(label);
            PdfPCell total = new PdfPCell(new Phrase("P" + PESO.format(po.totalAmount()), h));
            total.setBorder(0);
            total.setHorizontalAlignment(Element.ALIGN_RIGHT);
            total.setPadding(6);
            items.addCell(total);
            doc.add(items);

            if (po.notes() != null && !po.notes().isBlank()) {
                doc.add(new Paragraph(" "));
                doc.add(new Paragraph("Notes: " + po.notes(), body));
            }
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("______________________________", body));
            doc.add(new Paragraph("Authorized by", muted));
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("PO PDF failed", e);
        }
    }

    private static void cell(PdfPTable t, String text, Font f, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text == null ? "" : text, f));
        c.setBorder(PdfPCell.BOTTOM);
        c.setBorderColor(new Color(226, 232, 240));
        c.setPadding(5);
        c.setHorizontalAlignment(align);
        t.addCell(c);
    }
}
