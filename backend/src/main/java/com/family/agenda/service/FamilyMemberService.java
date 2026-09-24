package com.family.agenda.service;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.FamilyMemberMapper;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FamilyMemberService {

    private final FamilyMemberRepository repository;
    private final ReminderRepository reminderRepository;
    private final FamilyMemberMapper mapper;

    @Transactional(readOnly = true)
    public List<FamilyMemberDTO> findAll() {
        return repository.findAll(Sort.by("nom")).stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public FamilyMemberDTO findById(Long id) {
        return mapper.toDto(load(id));
    }

    public FamilyMemberDTO create(FamilyMemberRequest request) {
        return mapper.toDto(repository.save(mapper.toEntity(request)));
    }

    public FamilyMemberDTO update(Long id, FamilyMemberRequest request) {
        FamilyMember member = load(id);
        mapper.update(request, member);
        return mapper.toDto(member);
    }

    /** Le membre est retiré des reminders auxquels il participait ; les reminders et leur agenda restent. */
    public void delete(Long id) {
        FamilyMember member = load(id);
        reminderRepository.findByMemberId(id).forEach(r -> r.getMembres().remove(member));
        repository.delete(member);
    }

    private FamilyMember load(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }
}
