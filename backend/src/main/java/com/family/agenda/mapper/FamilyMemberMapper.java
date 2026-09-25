package com.family.agenda.mapper;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.entity.FamilyMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** avatarConfig : texte JSON en base, objet dans l'API (AvatarConfigConverter). */
@Mapper(uses = AvatarConfigConverter.class)
public interface FamilyMemberMapper {

    FamilyMemberDTO toDto(FamilyMember member);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "avatarConfig", ignore = true)
    FamilyMember toEntity(FamilyMemberRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "avatarConfig", ignore = true)
    void update(FamilyMemberRequest request, @MappingTarget FamilyMember member);
}
