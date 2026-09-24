package com.family.agenda.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

@Configuration
@EnableScheduling
public class AppConfig {

    /** Horloge injectable : permet de figer le temps dans les tests. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
