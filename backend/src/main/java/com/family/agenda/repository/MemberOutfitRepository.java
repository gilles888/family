package com.family.agenda.repository;

import com.family.agenda.entity.MemberOutfit;
import com.family.agenda.entity.MemberOutfitId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberOutfitRepository extends JpaRepository<MemberOutfit, MemberOutfitId> {

    List<MemberOutfit> findByMemberId(Long memberId);
}
