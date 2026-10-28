package com.family.agenda.security;

import com.family.agenda.repository.UserAccountRepository;
import com.family.agenda.service.AccountSecurityChangedEvent;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;
import org.springframework.security.web.authentication.rememberme.RememberMeAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;

import javax.sql.DataSource;
import java.util.UUID;

/**
 * Sécurité de l'API :
 * <ul>
 *   <li>session (cookie HttpOnly, SameSite=Lax, Secure selon {@code agenda.security.cookie-secure}), identifiant de
 *       session régénéré à la connexion ;</li>
 *   <li>« rester connecté » persistant (table persistent_logins), révoqué à la déconnexion, au changement de mot de
 *       passe et à la désactivation ;</li>
 *   <li>CSRF : cookie XSRF-TOKEN lisible par Angular, renvoyé dans l'en-tête X-XSRF-TOKEN ;</li>
 *   <li>tout /v1 exige d'être connecté, sauf POST /v1/auth/login ; un ENFANT ne fait que lire l'agenda, la météo
 *       et les repas, utiliser ses routines et modifier son personnage (contrôle fin par {@code @PreAuthorize}, voir
 *       {@link RoutineAccess} et {@link MemberAccess}) ;</li>
 *   <li>réponses JSON 401 / 403, jamais de redirection.</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    public static final String PARENT = "PARENT";
    /** Attribut de requête posé par la connexion quand « rester connecté » est coché. */
    public static final String REMEMBER_ME_ATTRIBUTE = SecurityConfig.class.getName() + ".rememberMe";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ProblemResponses problems, CookieCsrfTokenRepository csrfRepository,
                                            PersistentTokenBasedRememberMeServices rememberMeServices,
                                            UserAccountRepository accountRepository,
                                            @Value("${springdoc.api-docs.enabled:false}") boolean swagger) {
        http
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfRepository))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .rememberMe(remember -> remember.rememberMeServices(rememberMeServices).key(rememberMeServices.getKey()))
                .addFilterAfter(new AccountStateFilter(accountRepository, problems), RememberMeAuthenticationFilter.class)
                .exceptionHandling(errors -> errors.authenticationEntryPoint(problems).accessDeniedHandler(problems))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.POST, "/v1/auth/login").permitAll()
                            .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                            .requestMatchers("/error").permitAll();
                    if (swagger) {
                        auth.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**").permitAll();
                    }
                    auth.requestMatchers("/v1/auth/**").authenticated()
                            // Enfant : lecture de l'agenda, de la météo, des repas (et de leurs recettes), des membres
                            .requestMatchers(HttpMethod.GET, "/v1/routines/modeles").hasRole(PARENT)
                            .requestMatchers(HttpMethod.GET, "/v1/agenda/**", "/v1/meteo/**", "/v1/repas/**",
                                    "/v1/recettes/**", "/v1/membres", "/v1/membres/*").authenticated()
                            // … et ses routines : @PreAuthorize vérifie le membre lié
                            .requestMatchers(HttpMethod.GET, "/v1/membres/*/routines", "/v1/membres/*/routines/historique",
                                    "/v1/routines/*").authenticated()
                            .requestMatchers(HttpMethod.POST, "/v1/routines/*/runs/*/etapes/*/toggle",
                                    "/v1/routines/*/runs/*/recompense").authenticated()
                            // … ses étoiles retirées (lecture ; le retrait lui-même reste aux parents)
                            .requestMatchers(HttpMethod.GET, "/v1/membres/*/etoiles/retraits").authenticated()
                            // … et son personnage : @PreAuthorize vérifie le membre lié
                            .requestMatchers(HttpMethod.PUT, "/v1/membres/*/avatar").authenticated()
                            // Tout le reste de l'API (dont /v2… : version inconnue, 400 pour un parent) : parents
                            .requestMatchers("/v*/**").hasRole(PARENT)
                            .anyRequest().denyAll();
                });
        return http.build();
    }

    @Bean
    CookieCsrfTokenRepository csrfTokenRepository(AuthProperties properties) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie.secure(properties.cookieSecure()).sameSite("Lax"));
        return repository;
    }

    @Bean
    PersistentTokenRepository persistentTokenRepository(DataSource dataSource) {
        JdbcTokenRepositoryImpl repository = new JdbcTokenRepositoryImpl();
        repository.setDataSource(dataSource);
        return repository;
    }

    @Bean
    PersistentTokenBasedRememberMeServices rememberMeServices(AuthProperties properties, AccountUserDetailsService users,
                                                              PersistentTokenRepository tokens) {
        String key = properties.rememberMeKey().isBlank() ? UUID.randomUUID().toString() : properties.rememberMeKey();
        PersistentTokenBasedRememberMeServices services = new RequestAttributeRememberMeServices(key, users, tokens);
        services.setTokenValiditySeconds((int) properties.rememberMeDuree().toSeconds());
        services.setUseSecureCookie(properties.cookieSecure());
        services.setCookieCustomizer(cookie -> cookie.setAttribute("SameSite", "Lax"));
        return services;
    }

    /** Mot de passe changé, compte désactivé… : les jetons « rester connecté » du compte sont supprimés. */
    @Bean
    RememberMeRevoker rememberMeRevoker(PersistentTokenRepository tokens) {
        return new RememberMeRevoker(tokens);
    }

    public static class RememberMeRevoker {

        private final PersistentTokenRepository tokens;

        RememberMeRevoker(PersistentTokenRepository tokens) {
            this.tokens = tokens;
        }

        @EventListener
        public void onSecurityChange(AccountSecurityChangedEvent event) {
            tokens.removeUserTokens(event.identifiant());
        }
    }

    /**
     * La connexion est un POST JSON : « rester connecté » est signalé par un attribut de requête posé par
     * AuthController, pas par un paramètre de formulaire.
     */
    static class RequestAttributeRememberMeServices extends PersistentTokenBasedRememberMeServices {

        RequestAttributeRememberMeServices(String key, AccountUserDetailsService users, PersistentTokenRepository tokens) {
            super(key, users, tokens);
        }

        @Override
        protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
            return Boolean.TRUE.equals(request.getAttribute(REMEMBER_ME_ATTRIBUTE));
        }
    }
}
