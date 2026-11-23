package com.jfmprinthub.common;

import java.time.Instant;

/**
 * Open-ended timestamp filters are replaced by wide sentinel bounds so JPQL never binds an untyped NULL
 * timestamp (Postgres cannot infer its type in "? IS NULL" predicates).
 */
public final class TimeRange {

    public static final Instant MIN = Instant.parse("2000-01-01T00:00:00Z");
    public static final Instant MAX = Instant.parse("2200-01-01T00:00:00Z");

    private TimeRange() {}

    public static Instant from(Instant v) {
        return v == null ? MIN : v;
    }

    public static Instant to(Instant v) {
        return v == null ? MAX : v;
    }
}
