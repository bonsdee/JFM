package com.jfmprinthub.settings;

import com.jfmprinthub.settings.SettingsDtos.ContentBlock;
import com.jfmprinthub.settings.SettingsDtos.ContentUpdateRequest;
import com.jfmprinthub.settings.SettingsDtos.SettingsRequest;
import com.jfmprinthub.settings.SettingsDtos.SettingsResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Settings")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping("/settings")
    public SettingsResponse get() {
        return settingsService.get();
    }

    @PutMapping("/settings")
    public SettingsResponse update(@Valid @RequestBody SettingsRequest request) {
        return settingsService.update(request);
    }

    @GetMapping("/site-content")
    public List<ContentBlock> content() {
        return settingsService.allContent();
    }

    @PutMapping("/site-content/{key}")
    public ContentBlock putContent(@PathVariable String key, @Valid @RequestBody ContentUpdateRequest request) {
        return settingsService.putContent(key, request.content());
    }
}
