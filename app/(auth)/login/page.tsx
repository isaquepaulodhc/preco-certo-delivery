import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <Link href="/" className="mb-4 text-sm text-muted-foreground">
            Preco Certo Delivery
          </Link>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
