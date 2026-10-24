import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AccountDTO, ComptesService, FamilyMemberDTO, MembresService } from '../api-client';
import { AuthService } from '../auth/auth.service';
import { Avatar } from '../avatar/avatar';
import { NotificationService } from '../shared/notification.service';
import { AccountDialog, AccountDialogData } from './account-dialog';
import { ACCOUNT_ROLE_LABELS } from './account-labels';
import { PasswordResetDialog, PasswordResetDialogData } from './password-reset-dialog';

/**
 * Comptes de connexion (parents seulement) : créer, activer / désactiver, définir un mot de passe, lier à un membre.
 * Pas d'inscription publique : c'est la seule façon d'ajouter un compte, avec famille.json.
 */
@Component({
  selector: 'app-accounts-page',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatSlideToggleModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-page.html',
  styleUrl: './accounts-page.scss',
})
export class AccountsPage {
  private readonly api = inject(ComptesService);
  private readonly membresApi = inject(MembresService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly roleLabels = ACCOUNT_ROLE_LABELS;
  protected readonly accounts = rxResource<AccountDTO[], void>({ stream: () => this.api.listComptes() });
  protected readonly members = rxResource<FamilyMemberDTO[], void>({ stream: () => this.membresApi.listMembres() });
  private readonly membersById = computed(() => new Map((this.members.value() ?? []).map((m) => [m.id, m])));
  /** Heure de chargement : un blocage passé ne s'affiche plus. */
  private readonly now = new Date();

  protected member(account: AccountDTO): FamilyMemberDTO | undefined {
    return account.membreId == null ? undefined : this.membersById().get(account.membreId);
  }

  protected isMe(account: AccountDTO): boolean {
    return account.identifiant === this.auth.user()?.identifiant;
  }

  protected lockedUntil(account: AccountDTO): string | null {
    return account.bloqueJusqua && new Date(account.bloqueJusqua) > this.now ? account.bloqueJusqua : null;
  }

  protected create(): void {
    this.openDialog({ members: this.members.value() ?? [] });
  }

  protected edit(account: AccountDTO): void {
    this.openDialog({ members: this.members.value() ?? [], account });
  }

  protected setActive(account: AccountDTO, actif: boolean): void {
    this.api.updateCompte(account.id!, { role: account.role!, membreId: account.membreId ?? undefined, actif }).subscribe({
      next: () => {
        this.notifications.success(
          actif
            ? $localize`:@@accounts.enabled:Compte « ${account.identifiant}:name: » activé.`
            : $localize`:@@accounts.disabled:Compte « ${account.identifiant}:name: » désactivé : ses sessions sont fermées.`,
        );
        this.accounts.reload();
      },
      error: () => this.accounts.reload(),
    });
  }

  protected resetPassword(account: AccountDTO): void {
    this.dialog
      .open<PasswordResetDialog, PasswordResetDialogData, boolean>(PasswordResetDialog, { data: { account }, width: '440px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((done) => done && this.accounts.reload());
  }

  private openDialog(data: AccountDialogData): void {
    this.dialog
      .open<AccountDialog, AccountDialogData, boolean>(AccountDialog, { data, width: '480px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((saved) => saved && this.accounts.reload());
  }
}
