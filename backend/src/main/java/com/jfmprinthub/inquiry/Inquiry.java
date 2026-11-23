package com.jfmprinthub.inquiry;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Message submitted from the landing page contact form. */
@Getter
@Setter
@Entity
@Table(name = "inquiries")
public class Inquiry extends BaseEntity {

    public enum Status { NEW, READ, REPLIED, ARCHIVED }

    @Column(nullable = false)
    private String name;
    private String email;
    private String phone;
    private String subject;
    private String serviceInterest;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.NEW;

    private String ipAddress;
}
