package com.jfmprinthub.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class CategoryDtos {

    private CategoryDtos() {}

    public record CategoryRequest(@NotBlank @Size(max = 100) String name, String description, @NotNull Category.Kind kind) {}

    public record CategoryResponse(UUID id, String name, String description, Category.Kind kind, long itemCount,
                                   Instant createdAt) {}
}
