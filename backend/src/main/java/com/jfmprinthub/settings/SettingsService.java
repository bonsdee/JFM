package com.jfmprinthub.settings;

import com.fasterxml.jackson.databind.JsonNode;
import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.settings.SettingsDtos.ContentBlock;
import com.jfmprinthub.settings.SettingsDtos.SettingsRequest;
import com.jfmprinthub.settings.SettingsDtos.SettingsResponse;
import com.jfmprinthub.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SettingsService {

    /** Content keys the landing page understands. */
    public static final Set<String> CONTENT_KEYS =
            Set.of("hero", "stats", "howItWorks", "faq", "gallery", "marquee", "contact", "pricing");

    private final BusinessSettingsRepository settingsRepository;
    private final SiteContentRepository contentRepository;
    private final AuditService auditService;
    private final StorageService storageService;

    /** Returns the singleton settings row (created by migration V2). */
    @Transactional(readOnly = true)
    public BusinessSettings entity() {
        return settingsRepository.findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new NotFoundException("Business settings row missing — run migrations"));
    }

    @Transactional(readOnly = true)
    public SettingsResponse get() {
        return toResponse(entity());
    }

    @Transactional
    public SettingsResponse update(SettingsRequest r) {
        BusinessSettings s = entity();
        s.setBusinessName(r.businessName());
        s.setTagline(r.tagline());
        s.setLogoPath(r.logoPath());
        s.setAddress(r.address());
        s.setPhone(r.phone());
        s.setEmail(r.email());
        s.setTin(r.tin());
        s.setFacebookUrl(r.facebookUrl());
        s.setReceiptHeader(r.receiptHeader());
        s.setReceiptFooter(r.receiptFooter());
        s.setVatEnabled(r.vatEnabled());
        s.setVatRate(r.vatRate());
        s.setVatInclusive(r.vatInclusive());
        s.setDefaultReorderLevel(r.defaultReorderLevel());
        s.setAllowNegativeStock(r.allowNegativeStock());
        settingsRepository.save(s);
        auditService.record(AuditAction.UPDATE, "SETTINGS", 1, "Updated business settings");
        return toResponse(s);
    }

    @Transactional(readOnly = true)
    public List<ContentBlock> allContent() {
        return contentRepository.findAll().stream()
                .map(c -> new ContentBlock(c.getKey(), c.getContent(), c.getUpdatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public JsonNode content(String key) {
        return contentRepository.findById(key).map(SiteContent::getContent).orElse(null);
    }

    @Transactional
    public ContentBlock putContent(String key, JsonNode json) {
        if (!CONTENT_KEYS.contains(key)) {
            throw new BusinessException("UNKNOWN_CONTENT_KEY", "Unknown website content block: " + key);
        }
        SiteContent c = contentRepository.findById(key).orElseGet(() -> {
            SiteContent n = new SiteContent();
            n.setKey(key);
            return n;
        });
        c.setContent(json);
        contentRepository.save(c);
        auditService.record(AuditAction.UPDATE, "SITE_CONTENT", key, "Updated website content: " + key);
        return new ContentBlock(c.getKey(), c.getContent(), c.getUpdatedAt());
    }

    private SettingsResponse toResponse(BusinessSettings s) {
        return new SettingsResponse(s.getBusinessName(), s.getTagline(), s.getLogoPath(),
                storageService.publicUrl(storageService.buckets().businessAssets(), s.getLogoPath()),
                s.getAddress(), s.getPhone(), s.getEmail(), s.getTin(), s.getFacebookUrl(), s.getReceiptHeader(),
                s.getReceiptFooter(), s.isVatEnabled(), s.getVatRate(), s.isVatInclusive(),
                s.getDefaultReorderLevel(), s.isAllowNegativeStock(), s.getUpdatedAt());
    }
}
