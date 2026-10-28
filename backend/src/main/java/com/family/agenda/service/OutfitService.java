package com.family.agenda.service;

import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.MemberOutfit;
import com.family.agenda.entity.MemberOutfitId;
import com.family.agenda.entity.Saison;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.AvatarConfigConverter;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.MemberOutfitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Tenues de thème (« ma tenue Halloween ») : une config de personnage par membre et par thème. */
@Service
@RequiredArgsConstructor
@Transactional
public class OutfitService {

    private final MemberOutfitRepository repository;
    private final FamilyMemberRepository memberRepository;
    private final ShopService shop;
    private final AvatarConfigConverter converter;

    @Transactional(readOnly = true)
    public Map<String, Map<String, Object>> findForMember(Long memberId) {
        return group(repository.findByMemberId(memberId));
    }

    /** Tenues de tous les membres, par id de membre (une seule requête pour la liste des membres). */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, Map<String, Object>>> findAllByMember() {
        Map<Long, Map<String, Map<String, Object>>> result = new LinkedHashMap<>();
        for (MemberOutfit o : repository.findAll()) {
            result.computeIfAbsent(o.getMemberId(), k -> new LinkedHashMap<>()).put(o.getTheme().name(), converter.toMap(o.getConfig()));
        }
        return result;
    }

    /** Enregistre la tenue du thème. Même contrôle que le personnage : pas d'article payant non possédé. */
    public Map<String, Map<String, Object>> save(Long memberId, Saison theme, Map<String, Object> config) {
        loadMember(memberId);
        if (config == null || config.isEmpty()) {
            throw new BusinessRuleException("La tenue doit être un objet JSON non vide");
        }
        String json = converter.toJson(config);
        if (json.length() > FamilyMemberService.AVATAR_MAX) {
            throw new BusinessRuleException("La configuration d'avatar dépasse " + FamilyMemberService.AVATAR_MAX + " caractères");
        }
        shop.assertOwned(memberId, config);
        MemberOutfit outfit = repository.findById(new MemberOutfitId(memberId, theme)).orElseGet(() -> {
            MemberOutfit o = new MemberOutfit();
            o.setMemberId(memberId);
            o.setTheme(theme);
            return o;
        });
        outfit.setConfig(json);
        repository.save(outfit);
        return findForMember(memberId);
    }

    public Map<String, Map<String, Object>> delete(Long memberId, Saison theme) {
        loadMember(memberId);
        repository.findById(new MemberOutfitId(memberId, theme)).ifPresent(repository::delete);
        return findForMember(memberId);
    }

    /** Porter automatiquement la tenue du thème du moment, ou non. */
    public void setAuto(Long memberId, boolean actif) {
        loadMember(memberId).setTenueAuto(actif);
    }

    private Map<String, Map<String, Object>> group(List<MemberOutfit> outfits) {
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
        outfits.forEach(o -> result.put(o.getTheme().name(), converter.toMap(o.getConfig())));
        return result;
    }

    private FamilyMember loadMember(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }
}
