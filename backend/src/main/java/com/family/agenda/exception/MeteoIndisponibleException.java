package com.family.agenda.exception;

/** Open-Meteo injoignable et aucune prévision du jour en cache (HTTP 503). */
public class MeteoIndisponibleException extends RuntimeException {

    public MeteoIndisponibleException(Throwable cause) {
        super("Météo momentanément indisponible", cause);
    }
}
