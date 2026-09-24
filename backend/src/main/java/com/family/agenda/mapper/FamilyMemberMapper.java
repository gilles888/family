package com.family.agenda.mapper;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.entity.FamilyMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper
public interface FamilyMemberMapper {

    FamilyMemberDTO toDto(FamilyMember member);

    @Mapping(target = "id", ignore = true)
    FamilyMember toEntity(FamilyMemberRequest request);

    @Mapping(target = "id", ignore = true)
    void update(FamilyMemberRequest request, @MappingTarget FamilyMember member);
}
