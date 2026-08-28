// Nicknames aren't unique (see users.schema.ts) — this gives two people who
// picked the same nickname a stable, deterministic way to be told apart
// (Discord-style "name#TAG"), without a separate DB column or a uniqueness
// constraint that would force people into a username-hunting flow.
export function nicknameDiscriminator(userId: string): string {
  return userId.replace(/-/g, '').slice(-4).toUpperCase();
}
