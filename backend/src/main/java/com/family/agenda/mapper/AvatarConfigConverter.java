package com.family.agenda.mapper;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;

/** Configuration d'avatar : objet JSON dans l'API, texte JSON en base. */
@Component
@RequiredArgsConstructor
public class AvatarConfigConverter {

    private static final TypeReference<Map<String, Object>> OBJET = new TypeReference<>() {
    };

    private final JsonMapper jsonMapper;

    public Map<String, Object> toMap(String json) {
        return json == null ? null : jsonMapper.readValue(json, OBJET);
    }

    public String toJson(Map<String, Object> config) {
        return config == null ? null : jsonMapper.writeValueAsString(config);
    }
}
