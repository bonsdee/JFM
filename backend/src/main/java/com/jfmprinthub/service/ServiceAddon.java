package com.jfmprinthub.service;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Optional extra on a service.
 * FIXED = flat once; PERCENT = % of base; PER_UNIT = × billable units (sq ft/pages);
 * PER_PIECE = × chosen count (defaults to item quantity), e.g. eyelets.
 */
@Getter
@Setter
@Entity
@Table(name = "service_addons")
public class ServiceAddon extends BaseEntity {

    public enum ChargeType { FIXED, PERCENT, PER_UNIT, PER_PIECE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private CatalogService service;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeType chargeType;

    @Column(nullable = false)
    private BigDecimal amount;

    private boolean active = true;
}
