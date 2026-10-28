package com.family.agenda.repository;

import com.family.agenda.entity.MemberWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MemberWalletRepository extends JpaRepository<MemberWallet, Long> {

    /** Verrou en écriture : sérialise échanges et achats d'un même membre (double clic, deux appareils). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from MemberWallet w where w.memberId = :memberId")
    Optional<MemberWallet> findForUpdate(@Param("memberId") Long memberId);
}
