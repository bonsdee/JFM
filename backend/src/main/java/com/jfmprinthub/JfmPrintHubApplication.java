package com.jfmprinthub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * JFM PrintHub API — inventory, sales and print-services management for a single owner.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class JfmPrintHubApplication {

    public static void main(String[] args) {
        // Store and compute in UTC; business-day reporting converts to Asia/Manila explicitly.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(JfmPrintHubApplication.class, args);
    }
}
