package com.evently.evently.repository;

import com.evently.evently.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    long countByRoleIgnoreCaseAndStatusIgnoreCase(String role, String status);
    long countByRoleIgnoreCase(String role);
}
