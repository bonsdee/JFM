package com.jfmprinthub.supplier;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "suppliers")
public class Supplier extends BaseEntity {

    @Column(nullable = false)
    private String name;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String paymentTerms;
    private String notes;
    private boolean archived;
}
