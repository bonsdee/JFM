package com.jfmprinthub.supplier;

import com.jfmprinthub.supplier.SupplierDtos.SupplierRequest;
import com.jfmprinthub.supplier.SupplierDtos.SupplierResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper
public interface SupplierMapper {

    SupplierResponse toResponse(Supplier supplier);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "archived", ignore = true)
    void update(SupplierRequest request, @MappingTarget Supplier supplier);
}
