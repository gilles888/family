import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Notifications utilisateur (mat-snack-bar). Les messages sont déjà traduits par l'appelant. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly closeLabel = $localize`:@@common.close:Fermer`;

  success(message: string): void {
    this.snackBar.open(message, this.closeLabel, { duration: 4000 });
  }

  error(message: string): void {
    this.snackBar.open(message, this.closeLabel, { duration: 8000, panelClass: 'app-snack-error' });
  }
}
