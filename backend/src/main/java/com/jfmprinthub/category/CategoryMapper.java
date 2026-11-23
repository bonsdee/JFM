package com.jfmprinthub.category;

import com.jfmprinthub.category.CategoryDtos.CategoryRequest;
import com.jfmprinthub.category.CategoryDtos.CategoryResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper
public interface CategoryMapper {

    @Mapping(target = "itemCount", source = "itemCount")
    CategoryResponse toResponse(Category category, long itemCount);

    @Mapping(target = "id", ignore = true)
    void update(CategoryRequest request, @MappingTarget Category category);
}
