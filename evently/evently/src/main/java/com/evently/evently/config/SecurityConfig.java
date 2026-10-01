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
            .authorizeHttpRequests(auth -> auth
                // Allow static resources (CSS, JS, images, HTML)
                .requestMatchers(
                    "/**/*.css",
                    "/**/*.js",
                    "/**/*.png",
                    "/**/*.jpg",
                    "/**/*.jpeg",
                    "/**/*.gif",
                    "/**/*.svg",
                    "/**/*.html"
                ).permitAll()
                // Secure other endpoints
                .anyRequest().authenticated()
            )
            // Disable CSRF for simplicity (optional, depends on your app)
            .csrf(csrf -> csrf.disable());

        return http.build();
    }
}
