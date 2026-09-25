import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EntryList } from '../../agenda/entry-list';
import { AgendaCardsContext } from '../agenda-cards-context';

/** Carte « Tâches » : la liste des tâches de l'agenda, avec ses données. */
@Component({
  selector: 'app-tasks-card',
  imports: [EntryList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entry-list
      [entries]="agenda.tasks()"
      [members]="agenda.familyMembers()"
      (entryClick)="agenda.openEntry($event)"
    />
  `,
})
export class TasksCard {
  protected readonly agenda = inject(AgendaCardsContext);
}
