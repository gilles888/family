package com.family.agenda.config;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** Sans fichier famille : famille fictive de démonstration (base H2 dédiée). */
@SpringBootTest(properties = {
        "agenda.seed.enabled=true",
        "agenda.seed.fichier=src/test/resources/absent.json",
        "spring.datasource.url=jdbc:h2:mem:seed-demo;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE"})
class DemoSeedTest {

    @Autowired FamilyMemberService memberService;
    @Autowired RecipeService recipeService;

    @Test
    void fichierAbsentFamilleDeDemonstration() {
        assertThat(memberService.findAll()).extracting(FamilyMemberDTO::nom)
                .containsExactlyInAnyOrder("Maman", "Papa", "Léa", "Tom");
        assertThat(recipeService.findAll(null)).hasSize(3);
    }
}
