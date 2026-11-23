package com.jfmprinthub.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/** Single-row table (id = 1) holding business profile and operational policies. */
@Getter
@Setter
@Entity
@Table(name = "business_settings")
public class BusinessSettings {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id = SINGLETON_ID;

    @Column(nullable = false)
    private String businessName;
    private String tagline;
    private String logoPath;
    private String address;
    private String phone;
    private String email;
    private String tin;
    private String facebookUrl;
    private String receiptHeader;
    private String receiptFooter;
    private boolean vatEnabled;
    private BigDecimal vatRate;
    private boolean vatInclusive;
    private BigDecimal defaultReorderLevel;
    private boolean allowNegativeStock;

    @Column(updatable = false, insertable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
