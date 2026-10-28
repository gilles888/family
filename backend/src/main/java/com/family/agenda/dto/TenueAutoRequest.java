package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Porter automatiquement la tenue du thème du moment")
public record TenueAutoRequest(boolean actif) {
}
