package com.family.agenda.controller;

import com.family.agenda.dto.LoginRequest;
import com.family.agenda.dto.MeDTO;
import com.family.agenda.dto.PasswordChangeRequest;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.UserAccount;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.UserAccountRepository;
import com.family.agenda.security.AccountPrincipal;
import com.family.agenda.security.LoginService;
import com.family.agenda.security.SecurityConfig;
import com.family.agenda.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDateTime;

@RestController
@RequestMapping(path = "/auth", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Connexion", description = "Connexion, déconnexion, utilisateur connecté, changement de mot de passe")
public class AuthController {

    private final LoginService loginService;
    private final AccountService accountService;
    private final UserAccountRepository accountRepository;
    private final FamilyMemberRepository memberRepository;
    private final PersistentTokenBasedRememberMeServices rememberMeServices;
    private final CookieCsrfTokenRepository csrfRepository;
    private final Clock clock;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    @PostMapping("/login")
    @Operation(operationId = "login", summary = "Se connecter",
            description = """
                    Ouvre une session (cookie HttpOnly) ; avec `resterConnecte`, ajoute un cookie « rester connecté » \
                    de 30 jours. 5 échecs consécutifs bloquent la connexion 15 minutes. Un nouveau jeton CSRF \
                    (cookie XSRF-TOKEN) est émis.""")
    @ApiResponse(responseCode = "200", description = "Connecté")
    @ApiResponse(responseCode = "401", description = "code : IDENTIFIANTS_INVALIDES, COMPTE_BLOQUE (bloqueJusqua), COMPTE_DESACTIVE",
            content = @Content)
    public MeDTO login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        AccountPrincipal principal = loginService.login(request.identifiant(), request.motDePasse(), httpRequest.getRemoteAddr());
        principal.eraseCredentials();
        // Protection contre la fixation de session : nouvel identifiant de session
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        saveContext(authentication, httpRequest, httpResponse);
        // Nouveau jeton CSRF, lié à la session connectée
        CsrfToken token = csrfRepository.generateToken(httpRequest);
        csrfRepository.saveToken(token, httpRequest, httpResponse);
        if (Boolean.TRUE.equals(request.resterConnecte())) {
            httpRequest.setAttribute(SecurityConfig.REMEMBER_ME_ATTRIBUTE, true);
            rememberMeServices.loginSuccess(httpRequest, httpResponse, authentication);
        }
        return me(principal);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "logout", summary = "Se déconnecter",
            description = "Ferme la session et révoque les jetons « rester connecté » du compte.")
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        rememberMeServices.logout(request, response, authentication);
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        // Nouveau jeton CSRF (pas seulement supprimé) : la connexion suivante, depuis la même page, doit passer
        csrfRepository.saveToken(csrfRepository.generateToken(request), request, response);
    }

    @GetMapping("/me")
    @Operation(operationId = "getMe", summary = "Utilisateur connecté (401 si personne)")
    public MeDTO me(@AuthenticationPrincipal AccountPrincipal principal) {
        UserAccount account = accountRepository.findById(principal.id()).orElseThrow();
        String membreNom = account.getMemberId() == null ? null
                : memberRepository.findById(account.getMemberId()).map(FamilyMember::getNom).orElse(null);
        return new MeDTO(account.getIdentifiant(), account.getRole(), account.getMemberId(), membreNom,
                account.isDoitChangerMotDePasse());
    }

    @PostMapping(path = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "changePassword", summary = "Changer son mot de passe",
            description = "L'ancien mot de passe est exigé. Les autres sessions et les jetons « rester connecté » sont révoqués ; la session courante reste ouverte.")
    @ApiResponse(responseCode = "200", description = "Mot de passe changé")
    @ApiResponse(responseCode = "400", description = "Ancien mot de passe incorrect, ou nouveau trop court ou identique",
            content = @Content)
    public MeDTO changePassword(@AuthenticationPrincipal AccountPrincipal principal, @Valid @RequestBody PasswordChangeRequest request,
                                HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        UserAccount account = accountService.changeOwnPassword(principal.id(), request.ancienMotDePasse(), request.nouveauMotDePasse());
        rememberMeServices.logout(httpRequest, httpResponse, SecurityContextHolder.getContext().getAuthentication());
        // Session courante : nouvelle version de sécurité (les autres sessions sont refusées)
        AccountPrincipal updated = AccountPrincipal.of(account, LocalDateTime.now(clock));
        updated.eraseCredentials();
        saveContext(UsernamePasswordAuthenticationToken.authenticated(updated, null, updated.getAuthorities()), httpRequest, httpResponse);
        return me(updated);
    }

    private void saveContext(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }
}
