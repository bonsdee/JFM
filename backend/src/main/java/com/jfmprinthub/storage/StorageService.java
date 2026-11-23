package com.jfmprinthub.storage;

import com.fasterxml.jackson.databind.JsonNode;
import com.jfmprinthub.config.AppProperties;
import com.jfmprinthub.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Thin client over the Supabase Storage REST API. The service-role key never leaves the backend:
 * the browser receives short-lived signed upload/download URLs instead.
 */
@Slf4j
@Service
public class StorageService {

    private final AppProperties.Supabase supabase;
    private final RestClient client;

    public StorageService(AppProperties props) {
        this.supabase = props.supabase();
        String base = stripSlash(supabase.url()) + "/storage/v1";
        String key = supabase.serviceRoleKey() == null ? "" : supabase.serviceRoleKey();
        this.client = RestClient.builder()
                .baseUrl(base)
                .defaultHeader("Authorization", "Bearer " + key)
                .defaultHeader("apikey", key)
                .build();
    }

    public AppProperties.Buckets buckets() {
        return supabase.buckets();
    }

    /** Public URL for objects in public buckets (product-images, business-assets). */
    public String publicUrl(String bucket, String path) {
        if (path == null || path.isBlank()) return null;
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        return stripSlash(supabase.url()) + "/storage/v1/object/public/" + bucket + "/" + encodePath(path);
    }

    /** Builds a unique, safe object path: {@code folder/uuid-file-name.ext}. */
    public String newObjectPath(String folder, String fileName) {
        String clean = fileName == null ? "file" : fileName.toLowerCase()
                .replaceAll("[^a-z0-9._-]+", "-").replaceAll("-{2,}", "-");
        if (clean.length() > 80) clean = clean.substring(clean.length() - 80);
        return (folder == null || folder.isBlank() ? "" : folder + "/") + UUID.randomUUID() + "-" + clean;
    }

    public SignedUpload createSignedUpload(String bucket, String path) {
        requireKey();
        try {
            JsonNode res = client.post()
                    .uri("/object/upload/sign/{bucket}/" + encodePath(path), bucket)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of())
                    .retrieve()
                    .body(JsonNode.class);
            String relative = res == null ? null : res.path("url").asText(null);
            if (relative == null) throw new BusinessException("STORAGE_ERROR", "Storage did not return an upload URL");
            String token = relative.contains("token=") ? relative.substring(relative.indexOf("token=") + 6) : null;
            return new SignedUpload(bucket, path, stripSlash(supabase.url()) + "/storage/v1" + relative, token);
        } catch (RestClientException e) {
            log.error("Signed upload URL failed for {}/{}", bucket, path, e);
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "STORAGE_ERROR", "Could not create upload URL");
        }
    }

    public String createSignedDownloadUrl(String bucket, String path, int expiresInSeconds) {
        requireKey();
        try {
            JsonNode res = client.post()
                    .uri("/object/sign/{bucket}/" + encodePath(path), bucket)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", expiresInSeconds))
                    .retrieve()
                    .body(JsonNode.class);
            String relative = res == null ? null : res.path("signedURL").asText(null);
            return relative == null ? null : stripSlash(supabase.url()) + "/storage/v1" + relative;
        } catch (RestClientException e) {
            log.error("Signed download URL failed for {}/{}", bucket, path, e);
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "STORAGE_ERROR", "Could not create download URL");
        }
    }

    public void delete(String bucket, String path) {
        if (path == null || supabase.serviceRoleKey() == null || supabase.serviceRoleKey().isBlank()) return;
        try {
            client.method(org.springframework.http.HttpMethod.DELETE)
                    .uri("/object/{bucket}", bucket)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("prefixes", new String[]{path}))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not delete storage object {}/{}: {}", bucket, path, e.getMessage());
        }
    }

    private void requireKey() {
        if (supabase.serviceRoleKey() == null || supabase.serviceRoleKey().isBlank()) {
            throw new BusinessException("STORAGE_NOT_CONFIGURED", "SUPABASE_SERVICE_ROLE_KEY is not configured");
        }
    }

    private static String encodePath(String path) {
        return Arrays.stream(path.split("/"))
                .map(seg -> URLEncoder.encode(seg, StandardCharsets.UTF_8).replace("+", "%20"))
                .collect(Collectors.joining("/"));
    }

    private static String stripSlash(String s) {
        return s != null && s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    public record SignedUpload(String bucket, String path, String signedUrl, String token) {}
}
