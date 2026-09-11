import { dataBackend, getRepository } from "@/data";
import { updateMemberRoleAction } from "@/server/actions/profile";
import { can, requireUser, PERMISSIONS } from "@/server/auth";
import { btnGhost, Card, Notice, Select, Table } from "@/components/ui";

const ROLES = ["ADMIN", "ANALISTA", "INVESTIDOR", "JURIDICO", "FINANCEIRO", "VISUALIZACAO"] as const;

export default async function MembersPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const members = await repo.listMembers(user.groupId);
  const admin = can(user, "manageMembers");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Usuárias e papéis</h1>
        <p className="text-xs text-fg-faint">Sistema privado. Convites por e-mail são feitos no painel do Supabase Auth (Fase 1); a tela de convite chega na Fase 2.</p>
      </header>
      {dataBackend() === "local" && <Notice tone="warn">Modo local: troque de usuária com a variável LOCAL_USER (local-admin, local-analista, local-investidora) para testar permissões.</Notice>}
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              {admin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>{m.name}</td>
                <td className="text-fg-muted">{m.email}</td>
                <td>
                  {admin ? (
                    <form action={updateMemberRoleAction.bind(null, m.userId)} className="flex gap-2">
                      <Select name="role" defaultValue={m.role} className="w-40">
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                      <button className={btnGhost}>salvar</button>
                    </form>
                  ) : (
                    <span className="font-mono text-xs">{m.role}</span>
                  )}
                </td>
                {admin && <td></td>}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card title="Matriz de permissões (aplicação e RLS)">
        <Table>
          <thead>
            <tr>
              <th>Ação</th>
              {ROLES.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERMISSIONS).map(([k, roles]) => (
              <tr key={k}>
                <td className="font-mono text-xxs">{k}</td>
                {ROLES.map((r) => (
                  <td key={r} className={(roles as readonly string[]).includes(r) ? "text-ok" : "text-fg-faint"}>
                    {(roles as readonly string[]).includes(r) ? "✔" : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
