package com.evently.evently.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

@Configuration
public class CorsConfig {

    private final ApiAuthorizationInterceptor authorizationInterceptor;

    public CorsConfig(ApiAuthorizationInterceptor authorizationInterceptor) {
        this.authorizationInterceptor = authorizationInterceptor;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {

        return new WebMvcConfigurer() {

            // ================================
            // AUTHORIZATION INTERCEPTOR
            // ================================
            @Override
            public void addInterceptors(InterceptorRegistry registry) {

                registry.addInterceptor(authorizationInterceptor)
                        .addPathPatterns("/api/**")
                        .excludePathPatterns(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/bootstrap-admin"
                        );
            }

            // ================================
            // CORS CONFIGURATION
            // ================================
            @Override
            public void addCorsMappings(CorsRegistry registry) {

                registry.addMapping("/**")
                        .allowedOrigins(
                                "http://127.0.0.1:5500",
                                "http://localhost:5500",
                                "https://evently-production-a873.up.railway.app"
                        )
                        .allowedMethods(
                                "GET",
                                "POST",
                                "PUT",
                                "DELETE",
                                "PATCH",
                                "OPTIONS"
                        )
                        .allowedHeaders("*")
                        .exposedHeaders("Authorization")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}