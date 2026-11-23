package com.jfmprinthub.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Static helpers to read the current (owner) principal for auditing. */
public final class CurrentUser {

    private CurrentUser() {}

    public static String id() {
        Jwt jwt = jwt();
        return jwt != null ? jwt.getSubject() : "system";
    }

    public static String email() {
        Jwt jwt = jwt();
        return jwt != null ? jwt.getClaimAsString("email") : null;
    }

    private static Jwt jwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof Jwt jwt ? jwt : null;
    }
}
