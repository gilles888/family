package com.family.agenda.controller;

import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.dto.PorteMonnaieDTO;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.ShopService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Double clic : deux achats simultanés du même article, ou deux achats qui dépassent le solde, ne passent pas tous les
 * deux. Sans @Transactional : chaque appel est sa propre transaction, comme en production (données nettoyées à la fin).
 */
@SpringBootTest(properties = "agenda.seed.enabled=false")
class ShopConcurrencyTest {

    @Autowired ShopService shop;
    @Autowired FamilyMemberService members;

    private Long tom;

    @BeforeEach
    void setUp() {
        tom = members.create(new FamilyMemberRequest("Tom", "#4CAF50", null)).id();
    }

    @AfterEach
    void tearDown() {
        members.delete(tom);
    }

    private List<Object> enParallele(int n, Callable<Object> action) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch depart = new CountDownLatch(1);
        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            futures.add(pool.submit(() -> {
                depart.await();
                try {
                    return action.call();
                } catch (Exception e) {
                    return e;
                }
            }));
        }
        depart.countDown();
        List<Object> results = new ArrayList<>();
        for (Future<Object> f : futures) {
            results.add(f.get());
        }
        pool.shutdown();
        return results;
    }

    @Test
    void deuxAchatsDuMemeArticleUnSeulPasse() throws Exception {
        shop.adjust(tom, 12, "test", null);

        List<Object> results = enParallele(2, () -> shop.buy(tom, "costume-witch", null));

        assertThat(results.stream().filter(r -> r instanceof PorteMonnaieDTO)).hasSize(1);
        assertThat(results.stream().filter(r -> r instanceof ConflictException)).hasSize(1);
        assertThat(shop.porteMonnaie(tom).pieces()).isEqualTo(7);
        assertThat(shop.articles(tom)).hasSize(1);
    }

    @Test
    void deuxAchatsQuiDepassentLeSoldeUnSeulPasse() throws Exception {
        shop.adjust(tom, 5, "test", null);

        List<Object> results = enParallele(2, () -> shop.buy(tom, results(), null));

        assertThat(results.stream().filter(r -> r instanceof PorteMonnaieDTO)).hasSize(1);
        assertThat(results.stream().filter(r -> r instanceof BusinessRuleException)).hasSize(1);
        assertThat(shop.porteMonnaie(tom).pieces()).isZero();
    }

    private final java.util.concurrent.atomic.AtomicInteger suivant = new java.util.concurrent.atomic.AtomicInteger();

    /** Deux articles différents à 5 pièces, un par appel. */
    private String results() {
        return suivant.getAndIncrement() == 0 ? "costume-witch" : "costume-ghost";
    }
}
