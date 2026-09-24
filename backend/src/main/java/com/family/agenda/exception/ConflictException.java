package com.family.agenda.exception;

/** Opération en conflit avec une donnée existante (HTTP 409), ex. créneau de repas déjà occupé. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
