package com.jfmprinthub.common;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** All "business day" logic happens in Asia/Manila. */
public final class BusinessTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Manila");

    private BusinessTime() {}

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** Inclusive start of the given local date. */
    public static Instant startOf(LocalDate date) {
        return date.atStartOfDay(ZONE).toInstant();
    }

    /** Exclusive end (start of the next day). */
    public static Instant endOf(LocalDate date) {
        return date.plusDays(1).atStartOfDay(ZONE).toInstant();
    }

    public static LocalDate toLocalDate(Instant instant) {
        return instant.atZone(ZONE).toLocalDate();
    }
}
