package com.family.agenda.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderType type;

    @Column(nullable = false)
    private LocalDateTime dateHeureDebut;

    /** Optionnelle ; sert à calculer la durée de chaque occurrence. */
    private LocalDateTime dateHeureFin;

    @ManyToMany
    @JoinTable(name = "reminder_membres",
            joinColumns = @JoinColumn(name = "reminder_id"),
            inverseJoinColumns = @JoinColumn(name = "member_id"))
    @OrderBy("nom ASC")
    private Set<FamilyMember> membres = new LinkedHashSet<>();

    @Column(nullable = false)
    private boolean recurring;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "recurrence_rule_id")
    private RecurrenceRule recurrenceRule;

    /**
     * Faux après suppression : le reminder est archivé (et ses occurrences futures supprimées) mais il reste
     * référencé par les AgendaEntry passées, qui doivent rester inchangées.
     */
    @Column(nullable = false)
    private boolean actif = true;
}
