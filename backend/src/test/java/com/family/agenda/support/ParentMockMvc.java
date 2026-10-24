package com.family.agenda.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Tests d'API fonctionnels (hors sécurité) : chaque requête MockMvc est faite par un parent connecté, avec un jeton
 * CSRF valide. La sécurité elle-même est testée dans le package security, sans ce raccourci.
 */
@TestConfiguration(proxyBeanMethods = false)
public class ParentMockMvc {

    @Bean
    MockMvcBuilderCustomizer connecteEnParent() {
        return builder -> builder.defaultRequest(get("/").with(user("parent").roles("PARENT")).with(csrf()));
    }
}
