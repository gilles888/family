package com.family.agenda.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.accept.ApiVersionParser;
import org.springframework.web.accept.SemanticApiVersionParser;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.ApiVersionConfigurer;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Versioning d'API natif Spring Framework 7 : la version est le 1er segment du chemin ({@code /v1/agenda}).
 * <p>
 * Les contrôleurs déclarent leur version ({@code @RequestMapping(path = "/agenda", version = "1")}) et le
 * préfixe {@code /{version}} est ajouté à tous les contrôleurs du package {@code controller}. Une version
 * inconnue ({@code /v2/...}) est refusée en 400 par le framework.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    public static final String CONTROLLER_PACKAGE = "com.family.agenda.controller";

    @Override
    public void configureApiVersioning(ApiVersionConfigurer configurer) {
        configurer
                .usePathSegment(0)
                .setVersionParser(new VPrefixedVersionParser())
                .addSupportedVersions("1")
                .setVersionRequired(true);
    }

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/{version}", HandlerTypePredicate.forBasePackage(CONTROLLER_PACKAGE));
    }

    /** Le parser par défaut n'accepte que "1", "1.2"... : celui-ci tolère le préfixe "v" ("v1") de l'URL. */
    static class VPrefixedVersionParser implements ApiVersionParser<SemanticApiVersionParser.Version> {

        private final SemanticApiVersionParser delegate = new SemanticApiVersionParser();

        @Override
        public SemanticApiVersionParser.Version parseVersion(String version) {
            return delegate.parseVersion(version.startsWith("v") ? version.substring(1) : version);
        }
    }
}
