package com.jfmprinthub.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * A rule violation the user can fix (e.g. insufficient stock, invalid status transition).
 * Carries a machine-readable {@code code} for the frontend.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public BusinessException(String code, String message) {
        this(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
    }

    public BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static BusinessException conflict(String code, String message) {
        return new BusinessException(HttpStatus.CONFLICT, code, message);
    }
}
