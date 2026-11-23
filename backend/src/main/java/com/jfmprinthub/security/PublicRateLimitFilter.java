package com.jfmprinthub.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jfmprinthub.common.ApiError;
import com.jfmprinthub.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for anonymous write-ish endpoints:
 * <ul>
 *   <li>POST /api/public/inquiries — default 5 per hour per IP</li>
 *   <li>POST /api/public/quote — default 60 per minute per IP</li>
 * </ul>
 * Single-instance deployments only; swap for Redis/Bucket4j if you scale horizontally.
 */
@Component
@RequiredArgsConstructor
public class PublicRateLimitFilter extends OncePerRequestFilter {

    private final AppProperties props;
    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || !request.getRequestURI().startsWith("/api/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String uri = req.getRequestURI();
        int limit;
        Duration window;
        if (uri.startsWith("/api/public/inquiries")) {
            limit = props.rateLimit().inquiriesPerHour();
            window = Duration.ofHours(1);
        } else {
            limit = props.rateLimit().quotesPerMinute();
            window = Duration.ofMinutes(1);
        }
        String key = clientIp(req) + "|" + uri;
        if (!tryAcquire(key, limit, window.toMillis())) {
            res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.setHeader("Retry-After", String.valueOf(window.toSeconds()));
            objectMapper.writeValue(res.getOutputStream(),
                    ApiError.of(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please try again later.", uri));
            return;
        }
        chain.doFilter(req, res);
    }

    boolean tryAcquire(String key, int limit, long windowMs) {
        long now = System.currentTimeMillis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMs) q.pollFirst();
            if (q.size() >= limit) return false;
            q.addLast(now);
            return true;
        }
    }

    /** Evict idle keys so memory stays bounded. */
    @Scheduled(fixedDelay = 600_000)
    void cleanup() {
        long cutoff = System.currentTimeMillis() - Duration.ofHours(1).toMillis();
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long last = e.getValue().peekLast();
                return last == null || last < cutoff;
            }
        });
    }

    static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
