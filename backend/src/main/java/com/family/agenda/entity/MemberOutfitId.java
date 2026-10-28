package com.family.agenda.entity;

import java.io.Serializable;

public record MemberOutfitId(Long memberId, Saison theme) implements Serializable {
}
