package com.jfmprinthub.joborder;

import com.jfmprinthub.common.BusinessTime;
import com.jfmprinthub.joborder.JobOrderDtos.JobOrderResponse;
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
import com.lowagie.text.pdf.draw.DottedLineSeparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/** A5 job ticket (shop copy with specs) plus a tear-off claim stub for the customer. */
@Service
@RequiredArgsConstructor
public class JobTicketPdfService {

    private static final DecimalFormat PESO = new DecimalFormat("#,##0.00");
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("EEE, MMM d yyyy h:mm a");
    private static final Color INDIGO = new Color(99, 102, 241);

    private final JobOrderService jobOrderService;
    private final SettingsService settingsService;

    @Transactional(readOnly = true)
    public byte[] render(UUID id) {
        JobOrderResponse job = jobOrderService.get(id);
        BusinessSettings biz = settingsService.entity();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A5, 28, 28, 28, 28);
            PdfWriter.getInstance(doc, out);
            doc.open();
            Font h1 = new Font(Font.HELVETICA, 15, Font.BOLD, INDIGO);
            Font h2 = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font body = new Font(Font.HELVETICA, 9);
            Font small = new Font(Font.HELVETICA, 7.5f, Font.NORMAL, Color.GRAY);

            doc.add(new Paragraph(biz.getBusinessName() + " — JOB TICKET", h1));
            doc.add(new Paragraph(job.jobNumber() + "   •   Status: " + job.status().name().replace('_', ' '), h2));
            doc.add(new Paragraph(" ", small));

            PdfPTable info = new PdfPTable(new float[]{1, 2});
            info.setWidthPercentage(100);
            kv(info, "Customer", job.customerName(), body);
            kv(info, "Phone", job.customerPhone() == null ? "—" : job.customerPhone(), body);
            kv(info, "Created", DT.format(job.createdAt().atZone(BusinessTime.ZONE)), body);
            kv(info, "Due", job.dueAt() == null ? "—" : DT.format(job.dueAt().atZone(BusinessTime.ZONE)), body);
            doc.add(info);
            doc.add(new Paragraph(" ", small));

            PdfPTable items = new PdfPTable(new float[]{4, 1, 1.5f});
            items.setWidthPercentage(100);
            head(items, "Item / Specs");
            head(items, "Qty");
            head(items, "Amount");
            for (var i : job.items()) {
                StringBuilder spec = new StringBuilder(i.description());
                if (i.specs() != null) {
                    Object notes = i.specs().get("notes");
                    if (notes != null) spec.append("\nNotes: ").append(notes);
                    specLine(spec, i.specs());
                }
                cell(items, spec.toString(), body, Element.ALIGN_LEFT);
                cell(items, i.quantity().stripTrailingZeros().toPlainString(), body, Element.ALIGN_RIGHT);
                cell(items, "P" + PESO.format(i.lineTotal()), body, Element.ALIGN_RIGHT);
            }
            doc.add(items);

            PdfPTable totals = new PdfPTable(new float[]{3, 1.5f});
            totals.setWidthPercentage(60);
            totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
            money(totals, "Total", job.total(), h2);
            money(totals, "Paid", job.amountPaid(), body);
            money(totals, "Balance", job.balance(), h2);
            doc.add(totals);

            if (job.notes() != null && !job.notes().isBlank()) {
                doc.add(new Paragraph("Design notes: " + job.notes(), body));
            }
            doc.add(new Paragraph(" ", body));
            doc.add(new DottedLineSeparator());
            doc.add(new Paragraph("- - -  CLAIM STUB — present this when picking up", small));

            PdfPTable stub = new PdfPTable(new float[]{1, 1});
            stub.setWidthPercentage(100);
            kv(stub, "Job #", job.jobNumber(), h2);
            kv(stub, "Customer", job.customerName(), body);
            kv(stub, "Due", job.dueAt() == null ? "—" : DT.format(job.dueAt().atZone(BusinessTime.ZONE)), body);
            kv(stub, "Balance due", "P" + PESO.format(job.balance()), h2);
            doc.add(stub);
            doc.add(new Paragraph(biz.getBusinessName() + (biz.getPhone() != null ? " • " + biz.getPhone() : ""), small));
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Job ticket rendering failed", e);
        }
    }

    private static void specLine(StringBuilder sb, Map<String, Object> s) {
        if (s.get("widthFt") != null) sb.append("\nSize: ").append(s.get("widthFt")).append(" x ").append(s.get("heightFt")).append(" ft");
        if (s.get("pages") != null) sb.append("\nPages: ").append(s.get("pages"));
        if (Boolean.TRUE.equals(s.get("rush"))) sb.append("\nRUSH");
    }

    private static void kv(PdfPTable t, String k, String v, Font f) {
        PdfPCell a = new PdfPCell(new Phrase(k, new Font(Font.HELVETICA, 8, Font.BOLD, Color.GRAY)));
        a.setBorder(0);
        PdfPCell b = new PdfPCell(new Phrase(v == null ? "" : v, f));
        b.setBorder(0);
        t.addCell(a);
        t.addCell(b);
    }

    private static void head(PdfPTable t, String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 8.5f, Font.BOLD, Color.WHITE)));
        c.setBackgroundColor(INDIGO);
        c.setBorder(0);
        c.setPadding(4);
        t.addCell(c);
    }

    private static void cell(PdfPTable t, String text, Font f, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBorder(PdfPCell.BOTTOM);
        c.setBorderColor(new Color(226, 232, 240));
        c.setPadding(4);
        c.setHorizontalAlignment(align);
        t.addCell(c);
    }

    private static void money(PdfPTable t, String label, BigDecimal v, Font f) {
        PdfPCell a = new PdfPCell(new Phrase(label, f));
        a.setBorder(0);
        PdfPCell b = new PdfPCell(new Phrase("P" + PESO.format(v), f));
        b.setBorder(0);
        b.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(a);
        t.addCell(b);
    }
}
