package com.family.agenda.mapper;

import com.family.agenda.dto.RecurrenceRuleDTO;
import com.family.agenda.dto.RecurrenceRuleRequest;
import com.family.agenda.entity.RecurrenceRule;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.time.DayOfWeek;
import java.util.EnumSet;

@Mapper
public interface RecurrenceRuleMapper {

    RecurrenceRuleDTO toDto(RecurrenceRule rule);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "intervalle", source = "intervalle", defaultValue = "1")
    RecurrenceRule toEntity(RecurrenceRuleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "intervalle", source = "intervalle", defaultValue = "1")
    void update(RecurrenceRuleRequest request, @MappingTarget RecurrenceRule rule);

    @AfterMapping
    default void nonNullDays(@MappingTarget RecurrenceRule rule) {
        if (rule.getJoursSemaine() == null) {
            rule.setJoursSemaine(EnumSet.noneOf(DayOfWeek.class));
        }
    }
}
