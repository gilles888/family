import { Directive, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Affiche l'élément aux parents seulement : boutons d'ajout, de modification, de suppression.
 * Confort d'affichage : la vraie protection est faite par le backend (403 pour un enfant).
 *
 *   <button *appParentOnly matButton (click)="create()">…</button>
 */
@Directive({ selector: '[appParentOnly]' })
export class ParentOnly {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const show = this.auth.isParent();
      if (show && !this.shown) {
        this.container.createEmbeddedView(this.template);
      } else if (!show && this.shown) {
        this.container.clear();
      }
      this.shown = show;
    });
  }
}
