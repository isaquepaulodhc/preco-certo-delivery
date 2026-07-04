import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/storage/business-logos";

type AppShellProps = {
  children: React.ReactNode;
  businessName?: string | null;
  businessLogoUrl?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/store-profile", label: "Perfil" },
  { href: "/financial-settings", label: "Financeiro" },
  { href: "/fixed-costs", label: "Custos fixos" },
  { href: "/ingredients", label: "Ingredientes" },
  { href: "/products", label: "Produtos" },
  { href: "/combos", label: "Combos" },
];

export function AppShell({ children, businessName, businessLogoUrl }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            {businessLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogoUrl}
                alt={`Logo de ${businessName || "loja"}`}
                className="size-9 rounded-lg border object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-sm">
                {getInitials(businessName)}
              </span>
            )}
            <span>{businessName || "Preco Certo Delivery"}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
