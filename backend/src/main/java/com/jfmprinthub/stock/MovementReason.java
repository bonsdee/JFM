package com.jfmprinthub.stock;

import java.util.EnumSet;
import java.util.Set;

/** Why stock changed. Every movement carries exactly one reason. */
public enum MovementReason {
    PURCHASE_RECEIVED,
    SALE,
    SALE_VOID,
    JOB_CONSUMPTION,
    DAMAGED,
    EXPIRED,
    RETURN_FROM_CUSTOMER,
    RETURN_TO_SUPPLIER,
    MANUAL_ADJUSTMENT,
    PHYSICAL_COUNT,
    INITIAL;

    /** Reasons the owner may pick on the manual Stock In form. */
    public static final Set<MovementReason> MANUAL_IN = EnumSet.of(PURCHASE_RECEIVED, RETURN_FROM_CUSTOMER, MANUAL_ADJUSTMENT, INITIAL);

    /** Reasons the owner may pick on the manual Stock Out form. */
    public static final Set<MovementReason> MANUAL_OUT = EnumSet.of(DAMAGED, EXPIRED, RETURN_TO_SUPPLIER, JOB_CONSUMPTION, MANUAL_ADJUSTMENT);
}
