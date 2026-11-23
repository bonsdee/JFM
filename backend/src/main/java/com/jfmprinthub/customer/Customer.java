package com.jfmprinthub.customer;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {

    @Column(nullable = false)
    private String name;
    private String phone;
    private String email;
    private String facebookName;
    private String notes;
    private boolean archived;
}
