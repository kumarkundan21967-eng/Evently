package com.evently.evently.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class CorsConfig {

    private final String[] allowedOriginPatterns;

    private final ApiAuthorizationInterceptor authorizationInterceptor;

    public CorsConfig(
            ApiAuthorizationInterceptor authorizationInterceptor,
            @Value("${evently.cors.allowed-origin-patterns:http://127.0.0.1:5500,http://localhost:5500,https://*.up.railway.app}")
            String configuredOriginPatterns) {
        this.authorizationInterceptor = authorizationInterceptor;
        this.allowedOriginPatterns = configuredOriginPatterns.split("\\s*,\\s*");
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {

        return new WebMvcConfigurer() {

            // ==============================
            // API AUTHORIZATION
            // ==============================
            @Override
            public void addInterceptors(InterceptorRegistry registry) {

                registry.addInterceptor(authorizationInterceptor)
                        .addPathPatterns("/api/**")
                        .excludePathPatterns(
                                "/api/auth/**"
                        );
            }

            // ==============================
            // STATIC RESOURCES
            // ==============================
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {

                registry.addResourceHandler("/**")
                        .addResourceLocations(
                                "classpath:/static/"
                        );
            }

            // ==============================
            // CORS
            // ==============================
            @Override
            public void addCorsMappings(CorsRegistry registry) {

                registry.addMapping("/**")
                        .allowedOriginPatterns(allowedOriginPatterns)
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
