import { AccountDTO } from '../api-client';

export type AccountRole = AccountDTO.RoleEnum;

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  PARENT: $localize`:@@account.role.parent:Parent`,
  ENFANT: $localize`:@@account.role.child:Enfant`,
};

/** Mot de passe aléatoire lisible (sans 0/O, 1/l/I), à transmettre de vive voix ou sur papier. */
export function generatePassword(length = 14): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
}
