package com.family.agenda.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.parameters.Parameter;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.regex.Pattern;

@Configuration
public class OpenApiConfig {

    /** Préfixe tel que springdoc le publie : "/1/..." (version résolue depuis @RequestMapping) ou "/{version}/...". */
    private static final Pattern VERSION_PREFIX = Pattern.compile("^/(?:\\{version}|(\\d+))(?=/)");

    @Bean
    OpenAPI familyAgendaOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Agenda familial - API")
                        .version("v1")
                        .description("""
                                Un **Agenda** contient des **AgendaEntry** persistées. Créer un `Reminder` génère \
                                immédiatement ses entrées (une seule s'il est ponctuel, toute la fenêtre glissante \
                                s'il est récurrent) ; un job nocturne prolonge ensuite les récurrences.
                                
                                Commencer par la section **Agenda** : `GET /v1/agenda`."""));
    }

    /**
     * Côté Spring la version est le segment {@code v1} de l'URL, mais springdoc publie le numéro nu
     * ({@code /1/agenda}) : sans correction, « Try it out » appellerait une URL inexistante. On rétablit le
     * préfixe {@code /v1} et on retire tout faux paramètre de chemin « version ».
     */
    @Bean
    OpenApiCustomizer versionedPathsCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            Paths rewritten = new Paths();
            openApi.getPaths().forEach((path, item) -> {
                stripVersionParameter(item);
                rewritten.addPathItem(VERSION_PREFIX.matcher(path).replaceFirst(m -> "/v" + (m.group(1) != null ? m.group(1) : "1")), item);
            });
            openApi.setPaths(rewritten);
        };
    }

    private static void stripVersionParameter(PathItem item) {
        if (item.getParameters() != null) {
            item.getParameters().removeIf(OpenApiConfig::isVersionParameter);
        }
        item.readOperations().forEach(OpenApiConfig::stripVersionParameter);
    }

    private static void stripVersionParameter(Operation operation) {
        if (operation.getParameters() != null) {
            operation.getParameters().removeIf(OpenApiConfig::isVersionParameter);
        }
    }

    private static boolean isVersionParameter(Parameter p) {
        return "path".equals(p.getIn()) && "version".equals(p.getName());
    }
}
