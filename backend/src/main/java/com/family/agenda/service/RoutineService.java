package com.family.agenda.service;

import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.dto.RoutineHistoryDTO;
import com.family.agenda.dto.RoutineRequest;
import com.family.agenda.dto.RoutineRunDTO;
import com.family.agenda.dto.RoutineStepDTO;
import com.family.agenda.dto.RoutineStepRequest;
import com.family.agenda.dto.RoutineTemplateDTO;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.Routine;
import com.family.agenda.entity.RoutineRun;
import com.family.agenda.entity.RoutineStep;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.RoutineRepository;
import com.family.agenda.repository.RoutineRunRepository;
import com.family.agenda.service.RoutineTemplates.Template;
import com.family.agenda.service.RoutineTemplates.Text;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Routines des membres et leur suivi jour par jour. La fin d'une routine est calculée ici : toutes ses étapes
 * cochées → {@code completedAt} renseigné. Une seule exécution (RoutineRun) par routine et par jour.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RoutineService {

    /** Historique maximal (jours). */
    public static final int HISTORIQUE_MAX = 62;

    private final RoutineRepository repository;
    private final RoutineRunRepository runRepository;
    private final FamilyMemberRepository memberRepository;
    private final Clock clock;

    // ---------- lecture

    /** Toutes les routines du membre (actives ou non), dans l'ordre, avec leur état pour {@code date}. */
    @Transactional(readOnly = true)
    public List<RoutineDTO> findForMember(Long memberId, LocalDate date) {
        loadMember(memberId);
        List<Routine> routines = repository.findByMemberIdOrderByPositionAscIdAsc(memberId);
        Map<Long, RoutineRun> runs = runRepository.findByRoutineIdInAndDate(routines.stream().map(Routine::getId).toList(), date)
                .stream().collect(Collectors.toMap(r -> r.getRoutine().getId(), Function.identity()));
        return routines.stream().map(r -> toDto(r, date, runs.get(r.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public RoutineDTO findById(Long id, LocalDate date) {
        Routine routine = load(id);
        return toDto(routine, date, runRepository.findByRoutineIdAndDate(id, date).orElse(null));
    }

    /** Routines terminées par jour, sur les {@code jours} derniers jours (aujourd'hui compris), du plus ancien au plus récent. */
    @Transactional(readOnly = true)
    public List<RoutineHistoryDTO> history(Long memberId, int jours) {
        loadMember(memberId);
        LocalDate fin = today();
        LocalDate debut = fin.minusDays(Math.clamp(jours, 1, HISTORIQUE_MAX) - 1L);
        List<Long> ids = repository.findByMemberIdOrderByPositionAscIdAsc(memberId).stream().map(Routine::getId).toList();
        Map<LocalDate, List<Long>> parJour = new TreeMap<>();
        debut.datesUntil(fin.plusDays(1)).forEach(d -> parJour.put(d, new ArrayList<>()));
        runRepository.findByRoutineIdInAndDateBetweenAndCompletedAtNotNull(ids, debut, fin)
                .forEach(run -> parJour.get(run.getDate()).add(run.getRoutine().getId()));
        return parJour.entrySet().stream().map(e -> new RoutineHistoryDTO(e.getKey(), e.getValue())).toList();
    }

    // ---------- gestion (mode parent)

    public RoutineDTO create(RoutineRequest request) {
        if (request.membreId() == null) {
            throw new BusinessRuleException("membreId est obligatoire pour créer une routine");
        }
        FamilyMember member = loadMember(request.membreId());
        Routine routine = new Routine();
        routine.setMember(member);
        routine.setPosition(repository.countByMemberId(member.getId()));
        apply(request, routine);
        return toDto(repository.save(routine), today(), null);
    }

    /** Les étapes gardées (même id) conservent leurs coches du jour ; la fin du jour est recalculée. */
    public RoutineDTO update(Long id, RoutineRequest request) {
        Routine routine = load(id);
        apply(request, routine);
        repository.flush();
        return toDto(routine, today(), refreshTodayRun(routine));
    }

    public void delete(Long id) {
        repository.delete(load(id));
    }

    /** Nouvel ordre des étapes : exactement les ids des étapes de la routine. */
    public RoutineDTO reorder(Long id, List<Long> stepIds) {
        Routine routine = load(id);
        Set<Long> actuels = routine.getSteps().stream().map(RoutineStep::getId).collect(Collectors.toSet());
        if (stepIds == null || stepIds.size() != actuels.size() || !actuels.equals(new HashSet<>(stepIds))) {
            throw new BusinessRuleException("L'ordre doit contenir chaque étape de la routine exactement une fois");
        }
        Map<Long, RoutineStep> parId = routine.getSteps().stream().collect(Collectors.toMap(RoutineStep::getId, Function.identity()));
        IntStream.range(0, stepIds.size()).forEach(i -> parId.get(stepIds.get(i)).setPosition(i));
        routine.getSteps().sort(Comparator.comparingInt(RoutineStep::getPosition));
        return toDto(routine, today(), runRepository.findByRoutineIdAndDate(id, today()).orElse(null));
    }

    // ---------- modèles

    public List<RoutineTemplateDTO> templates(String langue) {
        return RoutineTemplates.ALL.stream().map(t -> {
            Text text = t.text(langue);
            List<RoutineStepDTO> etapes = IntStream.range(0, text.etapes().size())
                    .mapToObj(i -> new RoutineStepDTO(null, i, text.etapes().get(i), t.icones().get(i), RoutineTemplates.pastel(i)))
                    .toList();
            return new RoutineTemplateDTO(t.id(), text.nom(), text.sousTitre(), t.type(), t.theme(), etapes);
        }).toList();
    }

    /** Copie modifiable d'un modèle chez le membre, dans la langue demandée. */
    public RoutineDTO applyTemplate(Long memberId, String templateId, String langue) {
        Template template = RoutineTemplates.find(templateId)
                .orElseThrow(() -> new BusinessRuleException("Modèle inconnu : " + templateId));
        Text text = template.text(langue);
        List<RoutineStepRequest> etapes = IntStream.range(0, text.etapes().size())
                .mapToObj(i -> new RoutineStepRequest(null, text.etapes().get(i), template.icones().get(i), null))
                .toList();
        return create(new RoutineRequest(memberId, text.nom(), text.sousTitre(), template.type(), template.theme(),
                EnumSet.copyOf(template.jours()), template.debut(), template.fin(), true, etapes));
    }

    // ---------- suivi du jour (écran enfant)

    /** Coche ou décoche une étape de la routine du jour ; la routine est finie quand toutes ses étapes sont cochées. */
    public RoutineRunDTO toggleStep(Long routineId, LocalDate date, Long stepId) {
        requireToday(date);
        Routine routine = load(routineId);
        RoutineStep step = routine.getSteps().stream().filter(s -> s.getId().equals(stepId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Étape", stepId));
        RoutineRun run = runRepository.findByRoutineIdAndDate(routineId, date)
                .orElseGet(() -> runRepository.save(new RoutineRun(routine, date)));
        if (!run.getCheckedSteps().removeIf(s -> s.getId().equals(stepId))) {
            run.getCheckedSteps().add(step);
        }
        refreshCompletion(run, routine);
        return toRunDto(run, date);
    }

    /** Une partie de récompense par routine finie et par jour. */
    public RoutineRunDTO playReward(Long routineId, LocalDate date) {
        requireToday(date);
        load(routineId);
        RoutineRun run = runRepository.findByRoutineIdAndDate(routineId, date)
                .filter(r -> r.getCompletedAt() != null)
                .orElseThrow(() -> new ConflictException("La routine n'est pas encore terminée"));
        if (run.isRewardPlayed()) {
            throw new ConflictException("La récompense du jour a déjà été jouée");
        }
        run.setRewardPlayed(true);
        return toRunDto(run, date);
    }

    // ---------- interne

    private void apply(RoutineRequest request, Routine routine) {
        if ((request.heureDebut() == null) != (request.heureFin() == null)) {
            throw new BusinessRuleException("Indiquer l'heure de début et l'heure de fin, ou aucune des deux");
        }
        if (request.heureDebut() != null && !request.heureFin().isAfter(request.heureDebut())) {
            throw new BusinessRuleException("L'heure de fin doit suivre l'heure de début");
        }
        routine.setNom(request.nom().strip());
        routine.setSousTitre(request.sousTitre() == null || request.sousTitre().isBlank() ? null : request.sousTitre().strip());
        routine.setType(request.type());
        routine.setTheme(request.theme());
        routine.getJours().clear();
        routine.getJours().addAll(request.jours());
        routine.setHeureDebut(request.heureDebut());
        routine.setHeureFin(request.heureFin());
        routine.setActive(request.active() == null || request.active());
        applySteps(request.etapes() == null ? List.of() : request.etapes(), routine);
    }

    /** Remplace les étapes : un id connu garde l'étape (et ses coches), sans id = nouvelle étape. */
    private void applySteps(List<RoutineStepRequest> requests, Routine routine) {
        Map<Long, RoutineStep> existantes = routine.getSteps().stream()
                .collect(Collectors.toMap(RoutineStep::getId, Function.identity()));
        List<RoutineStep> gardees = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            RoutineStepRequest request = requests.get(i);
            RoutineStep step;
            if (request.id() != null) {
                step = existantes.get(request.id());
                if (step == null || gardees.contains(step)) {
                    throw new BusinessRuleException("Étape inconnue ou en double (id=%s)".formatted(request.id()));
                }
            } else {
                step = new RoutineStep();
                step.setRoutine(routine);
            }
            step.setPosition(i);
            step.setLibelle(request.libelle().strip());
            step.setIcone(request.icone());
            step.setCouleur(request.couleur() != null ? request.couleur().toUpperCase() : RoutineTemplates.pastel(i));
            gardees.add(step);
        }
        routine.getSteps().removeIf(s -> !gardees.contains(s));
        gardees.stream().filter(s -> !routine.getSteps().contains(s)).forEach(routine.getSteps()::add);
        routine.getSteps().sort(Comparator.comparingInt(RoutineStep::getPosition));
    }

    /** Après une modification des étapes : la routine du jour peut devenir finie, ou ne plus l'être. */
    private RoutineRun refreshTodayRun(Routine routine) {
        RoutineRun run = runRepository.findByRoutineIdAndDate(routine.getId(), today()).orElse(null);
        if (run != null) {
            Set<Long> ids = routine.getSteps().stream().map(RoutineStep::getId).collect(Collectors.toSet());
            run.getCheckedSteps().removeIf(s -> !ids.contains(s.getId()));
            refreshCompletion(run, routine);
        }
        return run;
    }

    private void refreshCompletion(RoutineRun run, Routine routine) {
        Set<Long> coches = run.getCheckedSteps().stream().map(RoutineStep::getId).collect(Collectors.toSet());
        boolean finie = !routine.getSteps().isEmpty()
                && routine.getSteps().stream().allMatch(s -> coches.contains(s.getId()));
        if (finie && run.getCompletedAt() == null) {
            run.setCompletedAt(LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
        } else if (!finie) {
            run.setCompletedAt(null);
        }
    }

    /** Pas de coche ni de récompense pour un autre jour (on ne rattrape pas hier, on n'avance pas demain). */
    private void requireToday(LocalDate date) {
        if (!date.equals(today())) {
            throw new BusinessRuleException("Seule la routine du jour (%s) peut être cochée".formatted(today()));
        }
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    private RoutineDTO toDto(Routine routine, LocalDate date, RoutineRun run) {
        List<RoutineStepDTO> etapes = routine.getSteps().stream()
                .sorted(Comparator.comparingInt(RoutineStep::getPosition))
                .map(s -> new RoutineStepDTO(s.getId(), s.getPosition(), s.getLibelle(), s.getIcone(), s.getCouleur()))
                .toList();
        return new RoutineDTO(routine.getId(), routine.getMember().getId(), routine.getNom(), routine.getSousTitre(),
                routine.getType(), routine.getTheme(), jours(routine), routine.getHeureDebut(),
                routine.getHeureFin(), routine.isActive(), routine.getPosition(), etapes, toRunDto(run, date));
    }

    private static Set<DayOfWeek> jours(Routine routine) {
        return routine.getJours().isEmpty() ? EnumSet.noneOf(DayOfWeek.class) : EnumSet.copyOf(routine.getJours());
    }

    private RoutineRunDTO toRunDto(RoutineRun run, LocalDate date) {
        if (run == null) {
            return new RoutineRunDTO(date, List.of(), false, null, false);
        }
        List<Long> coches = run.getCheckedSteps().stream().map(RoutineStep::getId).filter(Objects::nonNull).sorted().toList();
        return new RoutineRunDTO(run.getDate(), coches, run.getCompletedAt() != null, run.getCompletedAt(), run.isRewardPlayed());
    }

    private Routine load(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Routine", id));
    }

    private FamilyMember loadMember(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }
}
