package com.family.agenda.service;

import com.family.agenda.dto.ThemeSettingsDTO;
import com.family.agenda.dto.ThemeSettingsRequest;
import com.family.agenda.entity.FamilySettings;
import com.family.agenda.entity.Saison;
import com.family.agenda.entity.ThemeMode;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.FamilySettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class ThemeSettingsService {

    private final FamilySettingsRepository repository;
    private final FamilyMemberRepository memberRepository;
    private final Clock clock;

    /** Un thème forcé échu (ou dont le membre fêté a disparu) est remis en AUTO avant d'être renvoyé. */
    public ThemeSettingsDTO get() {
        FamilySettings settings = load();
        if (settings.getThemeMode() == ThemeMode.FORCE && expired(settings)) {
            reset(settings);
        }
        return toDto(settings);
    }

    public ThemeSettingsDTO update(ThemeSettingsRequest request, Long accountId) {
        LocalDate today = LocalDate.now(clock);
        FamilySettings settings = load();
        if (request.mode() == ThemeMode.FORCE) {
            if (request.theme() == null) {
                throw new BusinessRuleException("Un thème est obligatoire pour le mode FORCE");
            }
            if (request.theme() == Saison.ANNIVERSAIRE) {
                if (request.membreId() == null) {
                    throw new BusinessRuleException("Le membre fêté est obligatoire pour le thème ANNIVERSAIRE");
                }
                if (!memberRepository.existsById(request.membreId())) {
                    throw new BusinessRuleException("Membre introuvable : " + request.membreId());
                }
            }
            if (request.jusqua() != null && request.jusqua().isBefore(today)) {
                throw new BusinessRuleException("La date de fin du thème ne peut pas être dans le passé");
            }
            settings.setThemeMode(ThemeMode.FORCE);
            settings.setThemeForce(request.theme());
            settings.setThemeForceMembreId(request.theme() == Saison.ANNIVERSAIRE ? request.membreId() : null);
            settings.setThemeForceJusqua(request.jusqua());
        } else {
            reset(settings);
            settings.setThemeMode(request.mode());
        }
        settings.setAnniversairesActifs(request.anniversairesActifs());
        settings.setEnfantsPeuventChoisir(request.enfantsPeuventChoisir());
        settings.setModifiePar(accountId);
        settings.setModifieLe(LocalDateTime.now(clock));
        return toDto(settings);
    }

    private boolean expired(FamilySettings s) {
        boolean echu = s.getThemeForceJusqua() != null && s.getThemeForceJusqua().isBefore(LocalDate.now(clock));
        boolean membreDisparu = s.getThemeForce() == Saison.ANNIVERSAIRE && s.getThemeForceMembreId() == null;
        return echu || membreDisparu;
    }

    private void reset(FamilySettings s) {
        s.setThemeMode(ThemeMode.AUTO);
        s.setThemeForce(null);
        s.setThemeForceMembreId(null);
        s.setThemeForceJusqua(null);
    }

    private FamilySettings load() {
        return repository.findById(FamilySettings.ID).orElseGet(() -> repository.save(new FamilySettings()));
    }

    private ThemeSettingsDTO toDto(FamilySettings s) {
        return new ThemeSettingsDTO(s.getThemeMode(), s.getThemeForce(), s.getThemeForceMembreId(), s.getThemeForceJusqua(),
                s.isAnniversairesActifs(), s.isEnfantsPeuventChoisir());
    }
}
