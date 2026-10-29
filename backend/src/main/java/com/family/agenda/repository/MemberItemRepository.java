package com.family.agenda.repository;

import com.family.agenda.entity.MemberItem;
import com.family.agenda.entity.MemberItemId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberItemRepository extends JpaRepository<MemberItem, MemberItemId> {

    List<MemberItem> findByMemberIdOrderByAcquisLeAsc(Long memberId);

    boolean existsByMemberIdAndArticleId(Long memberId, String articleId);
}
