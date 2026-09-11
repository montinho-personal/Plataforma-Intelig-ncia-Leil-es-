import { getRepository } from "@/data";
import { can, requireUser } from "@/server/auth";
import { Card, Disclosure, Notice, Table } from "@/components/ui";

export default async function AuditPage() {
  const user = await requireUser();
  if (!can(user, "viewAudit")) return <Notice tone="accent">Auditoria visível para ADMIN e FINANCEIRO. Seu papel: {user.role}.</Notice>;
  const repo = await getRepository();
  const logs = await repo.listAuditLogs(user.groupId, 300);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Auditoria</h1>
        <p className="text-xs text-fg-faint">Quem · quando · valor anterior · valor novo. Registrado por trigger no banco (Supabase) ou pelo repositório local.</p>
      </header>
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Tabela</th>
              <th>Ação</th>
              <th>Quem</th>
              <th>Registro</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap font-mono text-xxs">{new Date(l.changedAt).toLocaleString("pt-BR")}</td>
                <td className="font-mono text-xxs">{l.tableName}</td>
                <td className="font-mono text-xxs">{l.action}</td>
                <td className="text-xxs">{l.changedBy ?? "—"}</td>
                <td className="font-mono text-xxs text-fg-faint">{l.rowId.slice(0, 8)}</td>
                <td>
                  <Disclosure summary="ver">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xxs text-fg-muted">{JSON.stringify(diff(l.oldValues, l.newValues), null, 1)}</pre>
                  </Disclosure>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function diff(oldV: unknown, newV: unknown) {
  if (!oldV || typeof oldV !== "object") return newV;
  if (!newV || typeof newV !== "object") return oldV;
  const o = oldV as Record<string, unknown>;
  const n = newV as Record<string, unknown>;
  const out: Record<string, { antes: unknown; depois: unknown }> = {};
  for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
    if (JSON.stringify(o[k]) !== JSON.stringify(n[k])) out[k] = { antes: o[k], depois: n[k] };
  }
  return out;
}
