package com.family.agenda.mapper;

import com.family.agenda.dto.AgendaEntryDTO;
import com.family.agenda.entity.AgendaEntry;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Mapper(uses = FamilyMemberMapper.class)
public interface AgendaEntryMapper {

    @Mapping(target = "reminderId", source = "reminder.id")
    @Mapping(target = "titre", source = "reminder.titre")
    @Mapping(target = "description", source = "reminder.description")
    @Mapping(target = "type", source = "reminder.type")
    @Mapping(target = "membres", source = "reminder.membres")
    @Mapping(target = "recurring", source = "reminder.recurring")
    @Mapping(target = "dateHeureFin", source = "entry", qualifiedByName = "finOccurrence")
    AgendaEntryDTO toDto(AgendaEntry entry);

    List<AgendaEntryDTO> toDtos(List<AgendaEntry> entries);

    /** Fin de l'occurrence = son début + la durée du reminder (dateHeureFin - dateHeureDebut). */
    @Named("finOccurrence")
    default LocalDateTime finOccurrence(AgendaEntry entry) {
        var reminder = entry.getReminder();
        if (reminder.getDateHeureFin() == null) {
            return null;
        }
        Duration duree = Duration.between(reminder.getDateHeureDebut(), reminder.getDateHeureFin());
        return entry.getDateHeure().plus(duree);
    }
}
