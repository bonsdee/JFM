package com.jfmprinthub.storage;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Issues signed upload URLs. The browser then calls
 * {@code supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)}.
 */
@Tag(name = "Storage")
@RestController
@RequestMapping("/api/v1/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StorageService storageService;

    public enum BucketKind { PRODUCT_IMAGES, JOB_FILES, BUSINESS_ASSETS }

    public record UploadUrlRequest(@NotNull BucketKind bucket, @NotBlank @Size(max = 200) String fileName,
                                   @Size(max = 60) String folder) {}

    public record UploadUrlResponse(String bucket, String path, String signedUrl, String token, String publicUrl) {}

    @PostMapping("/upload-url")
    public UploadUrlResponse uploadUrl(@Valid @RequestBody UploadUrlRequest request) {
        var b = storageService.buckets();
        String bucket = switch (request.bucket()) {
            case PRODUCT_IMAGES -> b.productImages();
            case JOB_FILES -> b.jobFiles();
            case BUSINESS_ASSETS -> b.businessAssets();
        };
        String folder = request.folder() == null ? "" : request.folder().replaceAll("[^a-zA-Z0-9_-]", "");
        String path = storageService.newObjectPath(folder, request.fileName());
        var signed = storageService.createSignedUpload(bucket, path);
        String publicUrl = request.bucket() == BucketKind.JOB_FILES ? null : storageService.publicUrl(bucket, path);
        return new UploadUrlResponse(bucket, path, signed.signedUrl(), signed.token(), publicUrl);
    }
}
