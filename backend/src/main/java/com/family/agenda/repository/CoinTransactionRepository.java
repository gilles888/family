package com.family.agenda.repository;

import com.family.agenda.entity.CoinTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {

    List<CoinTransaction> findByMemberIdOrderByIdDesc(Long memberId);
}
