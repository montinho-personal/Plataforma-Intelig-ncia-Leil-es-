import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/property-form";
import { Card } from "@/components/ui";
import { createPropertyAction } from "@/server/actions/properties";
import { can, requireUser } from "@/server/auth";

export default async function NewPropertyPage() {
  const user = await requireUser();
  if (!can(user, "editProperty")) redirect("/oportunidades");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Cadastrar imóvel</h1>
        <p className="text-xs text-fg-faint">Campos vazios ficam como AUSENTE, nunca como zero. Depois: comparáveis → valuation → reforma → underwriting → lance máximo → memorando.</p>
      </header>
      <Card>
        <PropertyForm action={createPropertyAction} submitLabel="Cadastrar e ir para comparáveis" />
      </Card>
    </div>
  );
}
