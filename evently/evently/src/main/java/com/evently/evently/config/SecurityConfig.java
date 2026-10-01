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
            // API requests are handled by ApiAuthorizationInterceptor
            .csrf(csrf -> csrf.disable())

            .authorizeHttpRequests(auth -> auth

                // Allow frontend static resources
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/*.html",
                    "/*.css",
                    "/*.js",
                    "/*.png",
                    "/*.jpg",
                    "/*.jpeg",
                    "/*.svg",
                    "/*.ico",
                    "/favicon.ico"
                ).permitAll()

                // ApiAuthorizationInterceptor handles API authorization
                .anyRequest().permitAll()
            )

            // Do not show Spring Security's default /login page
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}