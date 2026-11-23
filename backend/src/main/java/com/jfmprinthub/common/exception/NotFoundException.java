package com.jfmprinthub.common.exception;

import java.util.UUID;

/** 404 — requested entity does not exist. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String entity, UUID id) {
        return new NotFoundException(entity + " not found: " + id);
    }
}
