import Link from "next/link";

import { RegisterForm } from "@/components/forms/register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <Link href="/" className="mb-4 text-sm text-muted-foreground">
            Preco Certo Delivery
          </Link>
          <CardTitle>Criar conta</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </main>
  );
}
