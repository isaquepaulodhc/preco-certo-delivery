"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Calculator,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Leaf,
  LogOut,
  Package,
  ReceiptText,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/storage/business-logos";

type AppShellProps = {
  children: React.ReactNode;
  businessName?: string | null;
  businessLogoUrl?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/store-profile", label: "Perfil", icon: Store },
  { href: "/financial-settings", label: "Financeiro", icon: CircleDollarSign },
  { href: "/fixed-costs", label: "Custos fixos", icon: ReceiptText },
  { href: "/ingredients", label: "Ingredientes", icon: Leaf },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/combos", label: "Combos", icon: Boxes },
  { href: "/simulator", label: "Simulador", icon: Calculator },
  { href: "/billing", label: "Assinatura", icon: CreditCard },
];

export function AppShell({ children, businessName, businessLogoUrl }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] lg:flex">
      <aside className="border-b border-slate-800 bg-[#0F172A] text-slate-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-5 lg:block lg:px-6 lg:py-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            {businessLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogoUrl}
                alt={`Logo de ${businessName || "loja"}`}
                className="size-12 rounded-2xl border border-white/10 object-cover shadow-lg shadow-orange-500/20"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#F97316] text-base font-bold text-white shadow-lg shadow-orange-500/25">
                {getInitials(businessName)}
              </span>
            )}
            <span>
              <span className="block text-base font-bold text-white">
                {businessName || "Preco Certo Delivery"}
              </span>
              <span className="block text-xs text-slate-400">Delivery inteligente</span>
            </span>
          </Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 lg:hidden">
            CMV
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-5 pb-5 text-sm lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition lg:min-w-0 ${
                  isActive
                    ? "bg-[#F97316] text-white shadow-lg shadow-orange-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden px-4 py-5 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Operacao</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {businessName || "Preco Certo"}
            </p>
            <form action="/auth/signout" method="post" className="mt-4">
              <Button
                variant="outline"
                type="submit"
                className="w-full border-white/10 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <LogOut />
                Sair
              </Button>
            </form>
          </div>
        </div>

        <form action="/auth/signout" method="post" className="px-5 pb-5 lg:hidden">
          <Button
            variant="outline"
            type="submit"
            className="w-full border-white/10 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[#E2E8F0] bg-white/85 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F97316]">
                Preco Certo Delivery
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                CMV, margem e precificacao em um painel simples.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/billing"
                className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-sm font-semibold text-[#16A34A]"
              >
                Plano e acesso
              </Link>
              <Link
                href="/products"
                className="rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
              >
                Produtos
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
