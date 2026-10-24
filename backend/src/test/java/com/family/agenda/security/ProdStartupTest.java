package com.family.agenda.security;

import com.family.agenda.FamilyAgendaApplication;
import com.family.agenda.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Profil prod sur une base vide : sans ADMIN_USERNAME / ADMIN_PASSWORD, le démarrage est refusé. */
class ProdStartupTest {

    /** Profil prod, base H2 vierge dédiée (au lieu de PostgreSQL) ; arguments de ligne de commande = priorité maximale. */
    private static ConfigurableApplicationContext startProd(String... properties) {
        String db = "jdbc:h2:mem:prod-" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";
        List<String> args = new ArrayList<>(List.of("--spring.datasource.url=" + db, "--spring.datasource.username=sa",
                "--spring.datasource.password=", "--server.port=0", "--agenda.seed.enabled=false"));
        Arrays.stream(properties).map(p -> "--" + p).forEach(args::add);
        return new SpringApplicationBuilder(FamilyAgendaApplication.class).profiles("prod").run(args.toArray(String[]::new));
    }

    @Test
    void demarrageRefuseSansCompteAdministrateur() {
        assertThatThrownBy(() -> startProd("agenda.admin.username=", "agenda.admin.password=").close())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_USERNAME")
                .hasMessageContaining("ADMIN_PASSWORD");
    }

    @Test
    void motDePasseAdministrateurTropCourtRefuse() {
        assertThatThrownBy(() -> startProd("agenda.admin.username=parent", "agenda.admin.password=court").close())
                .rootCause()
                .hasMessageContaining("10 à 128 caractères");
    }

    @Test
    void premierCompteParentCreeDepuisLesVariables() {
        try (ConfigurableApplicationContext context = startProd("agenda.admin.username=Parent",
                "agenda.admin.password=mot-de-passe-prod-1")) {
            UserAccountRepository accounts = context.getBean(UserAccountRepository.class);
            assertThat(accounts.findByIdentifiant("parent")).hasValueSatisfying(a -> {
                assertThat(a.isActif()).isTrue();
                assertThat(a.getPasswordHash()).startsWith("{argon2}");
            });
        }
    }
}
