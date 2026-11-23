package com.jfmprinthub.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Money and quantity rounding helpers (₱ with 2 decimals, quantities with 3). */
public final class Money {

    public static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private Money() {}

    public static BigDecimal of(BigDecimal value) {
        return nz(value).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal qty(BigDecimal value) {
        return nz(value).setScale(3, RoundingMode.HALF_UP);
    }

    public static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /** value × percent / 100, rounded to centavos. */
    public static BigDecimal percentOf(BigDecimal value, BigDecimal percent) {
        return of(nz(value).multiply(nz(percent)).divide(HUNDRED, 6, RoundingMode.HALF_UP));
    }

    public static boolean isPositive(BigDecimal v) {
        return v != null && v.signum() > 0;
    }
}
