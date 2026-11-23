package com.jfmprinthub.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/**
 * Builds safe Pageables from query params ({@code page, size, sort=field,dir}).
 * Only whitelisted sort fields are honoured to avoid arbitrary property paths.
 */
public final class Pageables {

    private Pageables() {}

    public static Pageable of(int page, int size, String sort, Set<String> allowed, String defaultField, Sort.Direction defaultDir) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);
        String field = defaultField;
        Sort.Direction dir = defaultDir;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            if (allowed.contains(parts[0])) {
                field = parts[0];
                if (parts.length > 1) dir = "asc".equalsIgnoreCase(parts[1]) ? Sort.Direction.ASC : Sort.Direction.DESC;
            }
        }
        return PageRequest.of(safePage, safeSize, Sort.by(dir, field));
    }
}
