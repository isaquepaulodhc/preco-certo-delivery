import Link from "next/link";

import { Button } from "@/components/ui/button";

type AppShellProps = {
  children: React.ReactNode;
  businessName?: string | null;
};

export function AppShell({ children, businessName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-semibold">
            {businessName || "Preco Certo Delivery"}
          </Link>
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
