package com.family.agenda.repository;

import java.time.LocalDateTime;

public record EntryRange(long count, LocalDateTime first, LocalDateTime last) {
}
