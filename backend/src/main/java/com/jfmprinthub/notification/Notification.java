package com.jfmprinthub.notification;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A derived alert. {@code dedupeKey} (e.g. {@code LOW_STOCK:<productId>}) keeps one row per condition;
 * rows are removed automatically when the condition clears.
 */
@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    public enum Type { LOW_STOCK, OUT_OF_STOCK, OVERDUE_JOB, JOB_DUE_SOON, UNPAID_PO, NEW_INQUIRY }

    public enum Severity { INFO, WARNING, DANGER }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity = Severity.INFO;

    @Column(nullable = false)
    private String title;

    private String message;
    private String link;

    @Column(unique = true)
    private String dedupeKey;

    @Column(name = "is_read", nullable = false)
    private boolean read;
}
