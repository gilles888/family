package com.family.agenda.controller;

import com.family.agenda.service.MeteoFixtures;
import com.family.agenda.service.OpenMeteoClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /v1/meteo avec un faux Open-Meteo renvoyant 7 jours à partir d'aujourd'hui. */
@SpringBootTest(properties = {"agenda.seed.enabled=false", "meteo.fuseau=Europe/Brussels"})
@AutoConfigureMockMvc
class MeteoControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    OpenMeteoClient client;

    @BeforeEach
    void setUp() {
        LocalDate aujourdhui = LocalDate.now(ZoneId.of("Europe/Brussels"));
        when(client.previsionSemaine()).thenReturn(MeteoFixtures.prevision(aujourdhui, 7));
    }

    @Test
    void deuxJoursParDefaut() throws Exception {
        mvc.perform(get("/v1/meteo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lieu").value("Bruxelles"))
                .andExpect(jsonPath("$.jours", hasSize(2)));
    }

    @Test
    void septJours() throws Exception {
        mvc.perform(get("/v1/meteo").param("jours", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jours", hasSize(7)));
    }

    @Test
    void nombreDeJoursHorsBornes() throws Exception {
        mvc.perform(get("/v1/meteo").param("jours", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/v1/meteo").param("jours", "8"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
