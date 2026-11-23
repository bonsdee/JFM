package com.jfmprinthub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Strongly-typed application configuration bound from the {@code app.*} namespace.
 * All secrets come from environment variables (see application.yml and .env.example).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String timezone,
        Owner owner,
        Supabase supabase,
        Cors cors,
        RateLimit rateLimit
) {
    public record Owner(String id, String email) {}

    public record Supabase(String url, String jwksUrl, String jwtSecret, String serviceRoleKey, Buckets buckets) {
        /** Issuer claim Supabase puts in access tokens. */
        public String issuer() {
            return stripSlash(url) + "/auth/v1";
        }

        public String resolvedJwksUrl() {
            return (jwksUrl == null || jwksUrl.isBlank())
                    ? stripSlash(url) + "/auth/v1/.well-known/jwks.json"
                    : jwksUrl;
        }

        public boolean usesLegacySecret() {
            return jwtSecret != null && !jwtSecret.isBlank();
        }

        private static String stripSlash(String s) {
            return s != null && s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
        }
    }

    public record Buckets(String productImages, String jobFiles, String businessAssets) {}

    public record Cors(List<String> allowedOrigins) {}

    public record RateLimit(int inquiriesPerHour, int quotesPerMinute) {}
}
