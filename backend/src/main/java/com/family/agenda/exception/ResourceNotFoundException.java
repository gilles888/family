package com.family.agenda.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, Object id) {
        super("%s introuvable (id=%s)".formatted(resource, id));
    }
}
