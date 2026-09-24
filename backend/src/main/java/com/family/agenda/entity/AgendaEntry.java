package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Occurrence persistée d'un {@link Reminder} dans l'agenda. Unique par (reminder, dateHeure) : la génération
 * est ainsi idempotente, même en cas d'exécutions concurrentes.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "agenda_entry",
        uniqueConstraints = @UniqueConstraint(name = "uk_agenda_entry_reminder_date",
                columnNames = {"reminder_id", "date_heure"}),
        indexes = @Index(name = "idx_agenda_entry_date", columnList = "date_heure"))
public class AgendaEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reminder_id", nullable = false)
    private Reminder reminder;

    @Column(name = "date_heure", nullable = false)
    private LocalDateTime dateHeure;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EntryStatus statut = EntryStatus.PREVU;

    public AgendaEntry(Reminder reminder, LocalDateTime dateHeure) {
        this.reminder = reminder;
        this.dateHeure = dateHeure;
    }
}
