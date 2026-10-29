package com.family.agenda.entity;

import java.io.Serializable;

public record MemberItemId(Long memberId, String articleId) implements Serializable {
}
