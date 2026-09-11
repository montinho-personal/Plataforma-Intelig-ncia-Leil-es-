/** Usuária autenticada no Auth, mas sem grupo acessível (sem membership ou falha de permissão). */
export class NoMembershipError extends Error {
  constructor(
    public readonly email: string,
    public readonly detail: string,
  ) {
    super(`Sem grupo acessível para ${email}: ${detail}`);
  }
}
