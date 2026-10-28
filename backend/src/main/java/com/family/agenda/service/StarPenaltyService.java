package com.family.agenda.service;

import com.family.agenda.dto.StarPenaltyDTO;
import com.family.agenda.dto.StarPenaltyRequest;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.StarPenalty;
import com.family.agenda.entity.StarPenaltyReason;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.StarPenaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Étoiles retirées par un parent. Les étoiles gagnées ne sont pas stockées (voir {@link RoutineService#history}) :
 * un retrait est une ligne à part, annulable.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StarPenaltyService {

    private final StarPenaltyRepository repository;
    private final FamilyMemberRepository memberRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<StarPenaltyDTO> findForMember(Long memberId) {
        loadMember(memberId);
        return repository.findByMemberIdOrderByDateDescIdDesc(memberId).stream().map(StarPenaltyService::toDto).toList();
    }

    /** {@code accountId} : compte du parent (null si inconnu). */
    public StarPenaltyDTO create(Long memberId, StarPenaltyRequest request, Long accountId) {
        FamilyMember member = loadMember(memberId);
        String commentaire = request.commentaire() == null || request.commentaire().isBlank() ? null : request.commentaire().strip();
        if (request.motif() == StarPenaltyReason.AUTRE && commentaire == null) {
            throw new BusinessRuleException("Un commentaire est obligatoire pour le motif « Autre »");
        }
        LocalDate today = LocalDate.now(clock);
        LocalDate date = request.date() != null ? request.date() : today;
        if (date.isAfter(today)) {
            throw new BusinessRuleException("On ne peut pas retirer d'étoiles pour un jour à venir");
        }
        StarPenalty penalty = new StarPenalty();
        penalty.setMember(member);
        penalty.setDate(date);
        penalty.setNombre(request.nombre());
        penalty.setMotif(request.motif());
        penalty.setCommentaire(commentaire);
        penalty.setCreePar(accountId);
        penalty.setCreeLe(LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
        return toDto(repository.save(penalty));
    }

    /** Annule un retrait (erreur de saisie) : les étoiles sont rendues. */
    public void delete(Long memberId, Long penaltyId) {
        repository.delete(repository.findByIdAndMemberId(penaltyId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Retrait d'étoiles", penaltyId)));
    }

    static StarPenaltyDTO toDto(StarPenalty p) {
        return new StarPenaltyDTO(p.getId(), p.getDate(), p.getNombre(), p.getMotif(), p.getCommentaire());
    }

    private FamilyMember loadMember(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }
}
