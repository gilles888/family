package com.family.agenda.exception;

/** Requête syntaxiquement valide mais contraire à une règle métier (HTTP 400). */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
