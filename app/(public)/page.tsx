import Link from "next/link";
import { ArrowRight, BarChart3, Calculator, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  "Quanto custa realmente cada produto?",
  "O preco do iFood deveria ser diferente?",
  "Quais itens estao matando minha margem?",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Preco Certo Delivery
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Entrar
            </Link>
            <Link href="/register">
              <Button>Comecar agora</Button>
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              SaaS de precificacao para pequenos deliveries
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Voce sabe quanto realmente lucra em cada pedido do seu delivery?
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Cadastre ingredientes, produtos, taxas e combos. O sistema mostra
              quanto cobrar e quais itens estao matando sua margem.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  Comecar agora
                  <ArrowRight />
                </Button>
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium"
              >
                Ja tenho conta
              </Link>
            </div>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Exemplo simples de margem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Preco atual</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 28,00</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Custo seguro</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 14,60</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Taxas e desconto</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 4,45</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Lucro estimado</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 8,95</p>
                </div>
              </div>

              <div className="space-y-3">
                {painPoints.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 pb-8 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader>
              <Calculator className="size-5" />
              <CardTitle>CMV e preco sugerido</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Base para saber quanto cobrar sem misturar canais.
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <BarChart3 className="size-5" />
              <CardTitle>Impacto do iFood</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compare taxas, pagamento online e margem estimada.
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <ShieldCheck className="size-5" />
              <CardTitle>SaaS com dados reais</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Login, negocio isolado e persistencia no Supabase.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
