package com.evently.evently.model;

import jakarta.persistence.*;

@Entity
@Table(name = "admin_settings")
public class AdminSetting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "setting_key", unique = true, nullable = false)
    private String settingKey;
    @Column(name = "setting_value", nullable = false, length = 1000)
    private String settingValue;

    public Long getId() { return id; }
    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
}
