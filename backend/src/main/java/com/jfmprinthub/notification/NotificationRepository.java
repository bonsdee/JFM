package com.jfmprinthub.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByOrderByReadAscCreatedAtDesc();

    long countByReadFalse();

    @Modifying
    @Query("update Notification n set n.read = true where n.read = false")
    int markAllRead();
}
