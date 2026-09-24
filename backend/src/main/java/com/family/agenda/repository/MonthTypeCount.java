package com.family.agenda.repository;

import com.family.agenda.entity.ReminderType;

public record MonthTypeCount(int month, ReminderType type, long count) {
}
