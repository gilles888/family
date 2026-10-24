package com.family.agenda.repository;

import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    /** @param identifiant déjà en minuscules */
    Optional<UserAccount> findByIdentifiant(String identifiant);

    boolean existsByIdentifiant(String identifiant);

    List<UserAccount> findAllByOrderByIdentifiantAsc();

    long countByRoleAndActifTrue(AccountRole role);
}
