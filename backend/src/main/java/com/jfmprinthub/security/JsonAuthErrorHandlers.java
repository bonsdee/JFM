package com.jfmprinthub.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jfmprinthub.common.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** Writes 401/403 responses as JSON and logs the real reason a token was rejected. */
@Slf4j
@Component
@RequiredArgsConstructor
public class JsonAuthErrorHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) throws IOException {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        log.warn("401 on {} — {} | cause: {}", req.getRequestURI(), ex.getMessage(), root.getMessage());
        write(res, req, HttpStatus.UNAUTHORIZED, "Authentication required or token expired");
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
        log.warn("403 on {} — token is valid but not the configured APP_OWNER_ID", req.getRequestURI());
        write(res, req, HttpStatus.FORBIDDEN, "Only the business owner can access this resource");
    }

    private void write(HttpServletResponse res, HttpServletRequest req, HttpStatus status, String message) throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(res.getOutputStream(), ApiError.of(status, message, req.getRequestURI()));
    }
}