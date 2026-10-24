package com.family.agenda.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.ClassUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * Hachage des mots de passe : Argon2 (BouncyCastle) pour les nouveaux mots de passe, BCrypt si BouncyCastle est
 * absent. Les empreintes portent leur algorithme ({argon2}…, {bcrypt}…) : les deux restent vérifiables.
 */
@Configuration
public class PasswordConfig {

    static final String ARGON2_CLASS = "org.bouncycastle.crypto.generators.Argon2BytesGenerator";

    @Bean
    PasswordEncoder passwordEncoder() {
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put("bcrypt", new BCryptPasswordEncoder());
        boolean argon2 = ClassUtils.isPresent(ARGON2_CLASS, PasswordConfig.class.getClassLoader());
        if (argon2) {
            encoders.put("argon2", Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
        }
        return new DelegatingPasswordEncoder(argon2 ? "argon2" : "bcrypt", encoders);
    }
}
