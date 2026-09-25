import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ShoppingItemRequest } from '../api-client';
import { IngredientUnit } from '../shared/labels';

export type ShoppingItemForm = FormGroup<{
  nom: FormControl<string>;
  quantite: FormControl<number | null>;
  unite: FormControl<IngredientUnit | null>;
}>;

/** Nom obligatoire ; quantité et unité facultatives, mais pas d'unité sans quantité (règle du backend). */
export function shoppingItemForm(value?: Partial<ShoppingItemRequest>): ShoppingItemForm {
  return new FormGroup(
    {
      nom: new FormControl(value?.nom ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
      }),
      quantite: new FormControl<number | null>(value?.quantite ?? null, [Validators.min(0.001), Validators.max(9_999_999)]),
      unite: new FormControl<IngredientUnit | null>(value?.unite ?? null),
    },
    { validators: unitNeedsQuantity },
  );
}

function unitNeedsQuantity(group: AbstractControl): ValidationErrors | null {
  const { quantite, unite } = group.value as ShoppingItemRequest;
  return unite && quantite == null ? { unitWithoutQuantity: true } : null;
}

export function toRequest(form: ShoppingItemForm): ShoppingItemRequest {
  const { nom, quantite, unite } = form.getRawValue();
  return { nom: nom.trim(), quantite: quantite ?? undefined, unite: quantite == null ? undefined : (unite ?? undefined) };
}
