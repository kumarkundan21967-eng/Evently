package com.evently.evently.repository;

import com.evently.evently.model.AdminSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdminSettingRepository extends JpaRepository<AdminSetting, Long> {
    Optional<AdminSetting> findBySettingKey(String settingKey);
}
