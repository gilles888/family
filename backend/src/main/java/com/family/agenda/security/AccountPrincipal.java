package com.family.agenda.security;

import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Utilisateur connecté, gardé en session. La version de sécurité permet de refuser une session ouverte avant un
 * changement de mot de passe, une désactivation ou un changement de rôle (voir AccountStateFilter).
 */
public final class AccountPrincipal implements UserDetails, CredentialsContainer {

    private final Long id;
    private final String identifiant;
    private final AccountRole role;
    private final Long memberId;
    private final int versionSecurite;
    private final boolean enabled;
    private final boolean nonLocked;
    private String passwordHash;

    private AccountPrincipal(UserAccount account, LocalDateTime now) {
        this.id = account.getId();
        this.identifiant = account.getIdentifiant();
        this.role = account.getRole();
        this.memberId = account.getMemberId();
        this.versionSecurite = account.getVersionSecurite();
        this.enabled = account.isActif() && account.getPasswordHash() != null;
        this.nonLocked = !account.isBloque(now);
        this.passwordHash = account.getPasswordHash();
    }

    public static AccountPrincipal of(UserAccount account, LocalDateTime now) {
        return new AccountPrincipal(account, now);
    }

    public Long id() {
        return id;
    }

    public AccountRole role() {
        return role;
    }

    public Long memberId() {
        return memberId;
    }

    public int versionSecurite() {
        return versionSecurite;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return identifiant;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean isAccountNonLocked() {
        return nonLocked;
    }

    /** L'empreinte du mot de passe ne reste pas en session. */
    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }

    @Override
    public String toString() {
        return "AccountPrincipal[" + identifiant + ", " + role + "]";
    }
}
