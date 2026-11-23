package com.jfmprinthub.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Immutable record of a change: who, what, when. */
@Getter
@Setter
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String actorId;
    private String actorEmail;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String entityType;

    private String entityId;
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> details;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
