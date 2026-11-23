package com.jfmprinthub.publicsite;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jfmprinthub.inquiry.InquiryService;
import com.jfmprinthub.inquiry.InquiryService.InquiryRequest;
import com.jfmprinthub.service.PricingDtos.PublicQuote;
import com.jfmprinthub.service.PricingDtos.QuoteRequest;
import com.jfmprinthub.service.PricingService;
import com.jfmprinthub.service.ServiceCatalogService;
import com.jfmprinthub.service.ServiceDtos.PublicService;
import com.jfmprinthub.settings.BusinessSettings;
import com.jfmprinthub.settings.SettingsService;
import com.jfmprinthub.storage.StorageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Anonymous, read-only landing page API plus the two rate-limited POSTs (quote and inquiry).
 * Never exposes costs, stock or customer data.
 */
@Tag(name = "Public site")
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicSiteController {

    private final SettingsService settingsService;
    private final ServiceCatalogService catalogService;
    private final PricingService pricingService;
    private final InquiryService inquiryService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    /** Everything the landing page needs in one cached request. */
    @GetMapping("/site")
    public ResponseEntity<Map<String, Object>> site() {
        BusinessSettings s = settingsService.entity();
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("name", s.getBusinessName());
        business.put("tagline", s.getTagline());
        business.put("logoUrl", storageService.publicUrl(storageService.buckets().businessAssets(), s.getLogoPath()));
        business.put("address", s.getAddress());
        business.put("phone", s.getPhone());
        business.put("email", s.getEmail());
        business.put("facebookUrl", s.getFacebookUrl());

        Map<String, Object> content = new LinkedHashMap<>();
        settingsService.allContent().forEach(b -> content.put(b.key(), b.key().equals("gallery") ? resolveGallery(b.content()) : b.content()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("business", business);
        body.put("content", content);
        body.put("services", catalogService.publicList());
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(2)).cachePublic()).body(body);
    }

    @GetMapping("/services")
    public List<PublicService> services() {
        return catalogService.publicList();
    }

    @GetMapping("/gallery")
    public JsonNode gallery() {
        return resolveGallery(settingsService.content("gallery"));
    }

    /** Same pricing engine as POS and job orders, minus costs. */
    @PostMapping("/quote")
    public PublicQuote quote(@Valid @RequestBody QuoteRequest request) {
        return PublicQuote.from(pricingService.quote(request));
    }

    @PostMapping("/inquiries")
    public ResponseEntity<Map<String, String>> inquiry(@Valid @RequestBody InquiryRequest request, HttpServletRequest http) {
        String fwd = http.getHeader("X-Forwarded-For");
        String ip = fwd != null && !fwd.isBlank() ? fwd.split(",")[0].trim() : http.getRemoteAddr();
        inquiryService.submit(request, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Thanks! We'll get back to you shortly."));
    }

    /** Gallery items store a storage path; add a public URL for each. */
    private JsonNode resolveGallery(JsonNode gallery) {
        ArrayNode out = objectMapper.createArrayNode();
        if (gallery == null || !gallery.isArray()) return out;
        for (JsonNode item : gallery) {
            ObjectNode copy = item.deepCopy();
            String path = item.path("path").asText(null);
            String url = item.path("url").asText(null);
            copy.put("url", url != null && !url.isBlank() ? url : storageService.publicUrl(storageService.buckets().businessAssets(), path));
            out.add(copy);
        }
        return out;
    }
}
