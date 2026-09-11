import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/property-form";
import { Badge, Card, Notice } from "@/components/ui";
import { getRepository } from "@/data";
import { updatePropertyAction } from "@/server/actions/properties";
import { can, requireUser } from "@/server/auth";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const p = await repo.getProperty(user.groupId, id);
  if (!p) notFound();
  const action = updatePropertyAction.bind(null, id);
  return (
    <div className="space-y-4">
      {p.atypicalFlags.length > 0 && (
        <Notice tone={p.atypicalFlags.some((f) => f.severity === "CRITICAL") ? "bad" : "warn"}>
          <div className="flex flex-wrap gap-2">
            {p.atypicalFlags.map((f) => (
              <Badge key={f.code} tone={f.severity === "CRITICAL" ? "bad" : "warn"}>
                {f.code}
                {f.note ? `: ${f.note}` : ""}
              </Badge>
            ))}
          </div>
        </Notice>
      )}
      <Card title="Ficha do imóvel" subtitle="Dados do edital são fatos do edital; características informadas sem fonte são hipóteses até validação.">
        {can(user, "editProperty") ? <PropertyForm action={action} property={p} submitLabel="Salvar" /> : <p className="text-xs text-fg-muted">Seu papel ({user.role}) não edita o imóvel.</p>}
      </Card>
    </div>
  );
}
