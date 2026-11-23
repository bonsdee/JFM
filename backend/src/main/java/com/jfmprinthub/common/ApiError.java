package com.jfmprinthub.common;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;

/**
 * Consistent JSON error body for every non-2xx response.
 * <pre>{ "timestamp", "status", "error", "code", "message", "path", "fieldErrors": [{field, message}] }</pre>
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        List<FieldError> fieldErrors
) {
    public record FieldError(String field, String message) {}

    public static ApiError of(HttpStatus status, String message, String path) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), status.name(), message, path, null);
    }

    public static ApiError of(HttpStatus status, String code, String message, String path, List<FieldError> fieldErrors) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), code, message, path, fieldErrors);
    }
}
