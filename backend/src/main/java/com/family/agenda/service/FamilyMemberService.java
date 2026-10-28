package com.family.agenda.service;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.AvatarConfigConverter;
import com.family.agenda.mapper.FamilyMemberMapper;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.entity.MemberWallet;
import com.family.agenda.repository.MemberWalletRepository;
import com.family.agenda.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class FamilyMemberService {

    /** Taille maximale de la configuration d'avatar sérialisée (caractères). */
    public static final int AVATAR_MAX = 2000;

    private final FamilyMemberRepository repository;
    private final ReminderRepository reminderRepository;
    private final FamilyMemberMapper mapper;
    private final AvatarConfigConverter avatarConverter;
    private final OutfitService outfitService;
    private final ShopService shop;
    private final MemberWalletRepository walletRepository;

    @Transactional(readOnly = true)
    public List<FamilyMemberDTO> findAll() {
        Map<Long, Map<String, Map<String, Object>>> tenues = outfitService.findAllByMember();
        return repository.findAll(Sort.by("nom")).stream().map(m -> toDto(m, tenues.get(m.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public FamilyMemberDTO findById(Long id) {
        FamilyMember member = load(id);
        return toDto(member, outfitService.findForMember(id));
    }

    public FamilyMemberDTO create(FamilyMemberRequest request) {
        FamilyMember member = repository.save(mapper.toEntity(request));
        walletRepository.save(new MemberWallet(member.getId()));
        return toDto(member, Map.of());
    }

    public FamilyMemberDTO update(Long id, FamilyMemberRequest request) {
        FamilyMember member = load(id);
        mapper.update(request, member);
        return toDto(member, outfitService.findForMember(id));
    }

    /**
     * Enregistre le personnage du membre (null = revenir à l'avatar par défaut). Validation légère : le catalogue
     * des pièces est côté front ; ici, seulement un objet JSON de taille raisonnable.
     */
    public FamilyMemberDTO updateAvatar(Long id, Map<String, Object> config) {
        FamilyMember member = load(id);
        String json = avatarConverter.toJson(config);
        if (json != null && json.length() > AVATAR_MAX) {
            throw new BusinessRuleException("La configuration d'avatar dépasse " + AVATAR_MAX + " caractères");
        }
        shop.assertOwned(id, config);
        member.setAvatarConfig(json);
        return toDto(member, outfitService.findForMember(id));
    }

    /** Le membre est retiré des reminders auxquels il participait ; les reminders et leur agenda restent. */
    public void delete(Long id) {
        FamilyMember member = load(id);
        reminderRepository.findByMemberId(id).forEach(r -> r.getMembres().remove(member));
        repository.delete(member);
    }

    private FamilyMemberDTO toDto(FamilyMember member, Map<String, Map<String, Object>> tenues) {
        FamilyMemberDTO d = mapper.toDto(member);
        return new FamilyMemberDTO(d.id(), d.nom(), d.couleur(), d.avatarConfig(), d.dateNaissance(), d.tenueAuto(),
                tenues == null || tenues.isEmpty() ? null : tenues);
    }

    private FamilyMember load(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }
}
