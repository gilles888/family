package com.family.agenda.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.family.agenda.config.MeteoProperties;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Client de l'API de prévisions Open-Meteo (gratuite, sans clé). */
@Component
public class OpenMeteoClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);
    /** Une semaine, aujourd'hui compris : la carte (2 jours) et le dialogue semaine partagent le même appel. */
    public static final int FORECAST_DAYS = 7;

    private final MeteoProperties properties;
    private final RestClient restClient;

    public OpenMeteoClient(MeteoProperties properties) {
        this.properties = properties;
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    /** Prévisions des 7 prochains jours (aujourd'hui compris) pour le lieu configuré, dans son fuseau. */
    public Forecast previsionSemaine() {
        return restClient.get()
                .uri(uri -> uri.path("/v1/forecast")
                        .queryParam("latitude", properties.latitude())
                        .queryParam("longitude", properties.longitude())
                        .queryParam("timezone", properties.fuseau().getId())
                        .queryParam("forecast_days", FORECAST_DAYS)
                        .queryParam("daily", "temperature_2m_min,temperature_2m_max,precipitation_probability_max,"
                                + "precipitation_sum,weather_code,uv_index_max")
                        .queryParam("hourly", "apparent_temperature,precipitation_probability")
                        .build())
                .retrieve()
                .body(Forecast.class);
    }

    /** Réponse Open-Meteo : séries parallèles indexées comme {@code time}. Toute valeur peut être nulle. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Forecast(Daily daily, Hourly hourly) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Daily(
            List<LocalDate> time,
            @JsonProperty("temperature_2m_min") List<Double> temperatureMin,
            @JsonProperty("temperature_2m_max") List<Double> temperatureMax,
            @JsonProperty("precipitation_probability_max") List<Integer> precipitationProbabilityMax,
            @JsonProperty("precipitation_sum") List<Double> precipitationSum,
            @JsonProperty("weather_code") List<Integer> weatherCode,
            @JsonProperty("uv_index_max") List<Double> uvIndexMax) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Hourly(
            List<LocalDateTime> time,
            @JsonProperty("apparent_temperature") List<Double> apparentTemperature,
            @JsonProperty("precipitation_probability") List<Integer> precipitationProbability) {
    }
}
