package com.evently.evently.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .authorizeHttpRequests(auth -> auth

                // Static frontend resources
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/**/*.html",
                    "/**/*.css",
                    "/**/*.js",
                    "/**/*.png",
                    "/**/*.jpg",
                    "/**/*.jpeg",
                    "/**/*.svg",
                    "/**/*.ico",
                    "/favicon.ico"
                ).permitAll()

                // API authorization is handled separately
                .anyRequest().permitAll()
            )

            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}