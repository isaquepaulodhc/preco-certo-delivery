"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Calculator,
  CircleDollarSign,
  CreditCard,
  ArrowRight,
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
  { href: "/store-profile", label: "Perfil do negócio", icon: Store },
  { href: "/financial-settings", label: "Financeiro", icon: CircleDollarSign },
  { href: "/fixed-costs", label: "Custos fixos", icon: ReceiptText },
  { href: "/ingredients", label: "Ingredientes", icon: Leaf },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/combos", label: "Combos", icon: Boxes },
  { href: "/simulator", label: "Simulador de preço", icon: Calculator },
  { href: "/billing", label: "Plano e acesso", icon: CreditCard },
];

export function AppShell({ children, businessName, businessLogoUrl }: AppShellProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#0F172A] lg:flex">
      <aside className="border-b border-slate-800 bg-[#0F172A] text-slate-200 shadow-2xl shadow-slate-950/10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-80 lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex items-center justify-between gap-4 px-5 py-5 lg:block lg:px-6 lg:py-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            {businessLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogoUrl}
                alt={`Logo de ${businessName || "loja"}`}
                className="size-[52px] rounded-[18px] border border-white/10 object-cover shadow-lg shadow-orange-500/20"
              />
            ) : (
              <span className="flex size-[52px] items-center justify-center rounded-[18px] bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-base font-extrabold text-white shadow-lg shadow-orange-500/25">
                {getInitials(businessName)}
              </span>
            )}
            <span>
              <span className="block text-[17px] font-extrabold leading-tight text-white">
                {businessName || "Preço Certo Delivery"}
              </span>
              <span className="mt-0.5 block text-sm text-slate-400">Delivery inteligente</span>
            </span>
          </Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 lg:hidden">
            CMV
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-5 pb-5 text-sm lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-4 lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (pathname === "/pricing-status" && item.href === "/dashboard");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-fit items-center gap-3 rounded-[16px] px-3.5 py-3 font-semibold transition lg:min-w-0 ${
                  isActive
                    ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden px-4 py-5 lg:block">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 shadow-inner shadow-white/5">
            <p className="text-xs font-semibold leading-5 text-slate-400">
              CMV, Margem e Precificação
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              {businessName || "Preço Certo"}
            </p>
            <p className="mt-1 text-xs text-slate-400">Resumo da operação</p>
            <form action="/auth/signout" method="post" className="mt-4">
              <Button
                variant="outline"
                type="submit"
                className="w-full rounded-xl border-white/10 bg-transparent font-bold text-slate-200 hover:bg-white/10 hover:text-white"
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
            className="w-full rounded-xl border-white/10 bg-transparent font-bold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-h-screen min-w-0 flex-1 bg-[#F8FAFC] lg:my-3 lg:mr-3 lg:overflow-hidden lg:rounded-l-[30px] lg:border lg:border-white/70 lg:shadow-2xl lg:shadow-slate-950/10">
        {!isDashboard ? (
          <header className="border-b border-[#E2E8F0] bg-white/85 px-5 py-3 backdrop-blur lg:px-8">
            <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-end gap-2">
              <Link
                href="/billing"
                className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-sm font-bold text-[#16A34A]"
              >
                Plano e acesso
              </Link>
              <Link
                href="/pricing-status"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-bold text-[#0F172A] transition hover:border-[#F97316]/40 hover:text-[#EA580C]"
              >
                Ver diagnóstico
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/products"
                className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
              >
                Cadastrar produto
              </Link>
            </div>
          </header>
        ) : null}
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-10 2xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
