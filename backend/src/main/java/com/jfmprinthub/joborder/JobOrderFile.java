package com.jfmprinthub.joborder;

import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Customer design file stored in the private {@code job-files} Supabase bucket. */
@Getter
@Setter
@Entity
@Table(name = "job_order_files")
public class JobOrderFile extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_order_id", nullable = false)
    private JobOrder jobOrder;

    @Column(nullable = false)
    private String bucket;

    @Column(nullable = false)
    private String path;

    @Column(nullable = false)
    private String fileName;

    private String contentType;
    private Long sizeBytes;
}
