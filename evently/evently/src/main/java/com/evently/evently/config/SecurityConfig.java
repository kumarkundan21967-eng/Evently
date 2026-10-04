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
            // ==============================
            // CORS
            // ==============================
            .cors(cors -> {})

            // ==============================
            // AUTHORIZATION
            // ==============================
            .authorizeHttpRequests(auth -> auth

                // ==============================
                // PUBLIC FRONTEND / STATIC FILES
                // ==============================
                .requestMatchers(
                    "/",
                    "/*.html",
                    "/*.css",
                    "/*.js",
                    "/*.png",
                    "/*.jpg",
                    "/*.jpeg",
                    "/*.gif",
                    "/*.svg",
                    "/*.ico",
                    "/*.webp"
                ).permitAll()

                // ==============================
                // PUBLIC AUTH APIs
                // ==============================
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/bootstrap-admin"
                ).permitAll()

                // ==============================
                // API authorization is enforced by ApiAuthorizationInterceptor,
                // which validates the application's bearer sessions and roles.
                // ==============================
                .requestMatchers("/api/**").permitAll()
                .anyRequest().permitAll()
            )

            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())

            // ==============================
            // CSRF
            // ==============================
            .csrf(csrf -> csrf.disable());

        return http.build();
    }
}
