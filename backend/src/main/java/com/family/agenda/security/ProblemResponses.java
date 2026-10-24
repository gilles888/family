package com.family.agenda.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Réponses de sécurité en JSON (ProblemDetail, comme le reste de l'API), jamais de redirection HTML :
 * 401 non connecté, 403 interdit (avec un {@code code} : ACTION_NON_AUTORISEE, CSRF_INVALIDE, MOT_DE_PASSE_A_CHANGER).
 */
@Component
public class ProblemResponses implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final JsonMapper jsonMapper;

    public ProblemResponses(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         org.springframework.security.core.AuthenticationException e) throws IOException {
        write(request, response, HttpStatus.UNAUTHORIZED, "NON_CONNECTE", "Connexion requise");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       org.springframework.security.access.AccessDeniedException e) throws IOException {
        if (e instanceof CsrfException) {
            write(request, response, HttpStatus.FORBIDDEN, "CSRF_INVALIDE", "Jeton CSRF absent ou invalide : rechargez la page");
        } else {
            write(request, response, HttpStatus.FORBIDDEN, "ACTION_NON_AUTORISEE", "Action non autorisée");
        }
    }

    public void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code,
                      String detail) throws IOException {
        // Même forme que les ProblemDetail de l'API (sans dépendre du mixin Jackson de Spring MVC)
        Map<String, Object> problem = new LinkedHashMap<>();
        problem.put("type", "about:blank");
        problem.put("title", status.getReasonPhrase());
        problem.put("status", status.value());
        problem.put("detail", detail);
        problem.put("instance", request.getRequestURI());
        problem.put("code", code);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        jsonMapper.writeValue(response.getOutputStream(), problem);
    }
}
