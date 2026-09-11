import { redirect } from "next/navigation";

/** Erro de validação/negócio a ser exibido para a usuária (não é bug). */
export class ActionError extends Error {}

function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: string } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

/**
 * Executa uma server action e, em caso de erro de negócio, redireciona para a página
 * com ?error=mensagem. Em produção o Next omite mensagens de exceções em actions; este
 * caminho garante que a usuária veja o motivo (ex.: "Informe o motivo da exclusão").
 */
export async function guarded<T>(returnPath: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    const message = e instanceof Error ? e.message : "Erro inesperado";
    redirect(`${returnPath}${returnPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
  }
}
