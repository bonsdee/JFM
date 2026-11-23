package com.jfmprinthub.customer;

import com.jfmprinthub.customer.CustomerDtos.CustomerRequest;
import com.jfmprinthub.customer.CustomerDtos.CustomerResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper
public interface CustomerMapper {

    CustomerResponse toResponse(Customer customer);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "archived", ignore = true)
    void update(CustomerRequest request, @MappingTarget Customer customer);
}
