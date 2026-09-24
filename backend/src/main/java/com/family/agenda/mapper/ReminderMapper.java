package com.family.agenda.mapper;

import com.family.agenda.dto.ReminderDTO;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.entity.Reminder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Les membres et la règle de récurrence sont résolus par ReminderService (références, cycle de vie JPA). */
@Mapper(uses = {FamilyMemberMapper.class, RecurrenceRuleMapper.class})
public interface ReminderMapper {

    @Mapping(target = "recurrence", source = "recurrenceRule")
    ReminderDTO toDto(Reminder reminder);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "membres", ignore = true)
    @Mapping(target = "recurrenceRule", ignore = true)
    @Mapping(target = "actif", ignore = true)
    Reminder toEntity(ReminderRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "membres", ignore = true)
    @Mapping(target = "recurrenceRule", ignore = true)
    @Mapping(target = "actif", ignore = true)
    void update(ReminderRequest request, @MappingTarget Reminder reminder);
}
