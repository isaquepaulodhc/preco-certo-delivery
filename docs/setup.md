# Setup Futuro

Este documento descreve como o projeto devera ser configurado quando a implementacao comecar. Nesta etapa, nenhum projeto Next.js foi criado e nenhuma dependencia foi instalada.

## Stack Prevista

- Next.js com App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Supabase Auth.
- Supabase Postgres.
- Supabase Storage.
- `supabase-js`.
- React Hook Form.
- Zod.
- Recharts.
- date-fns.
- lucide-react.
- Vitest.

As versoes exatas devem ser registradas aqui quando forem instaladas.

## Instalacao De Dependencias

Quando a Fase 1 for autorizada, criar o projeto e instalar dependencias com o gerenciador escolhido.

Regras:

- Versionar o lockfile.
- Nao remover `package-lock.json`, `pnpm-lock.yaml` ou `yarn.lock` se existir.
- Preferir versoes fixas para dependencias principais.
- Nao atualizar versoes major sem autorizacao.

## Variaveis De Ambiente Previstas

Criar `.env.example` durante a Fase 1 com:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
PIX_KEY=
PIX_RECEIVER_NAME=
```

Regras:

- `NEXT_PUBLIC_SUPABASE_URL` pode ir ao frontend.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ir ao frontend.
- `SUPABASE_SERVICE_ROLE_KEY` nunca pode ir ao frontend.
- `SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas server-side.
- Nunca criar `.env.local` com segredos reais em documentacao ou commits.

## Rodar Localmente

Fluxo esperado apos a criacao do projeto:

```bash
npm install
npm run dev
```

Ou comando equivalente do gerenciador escolhido.

Registrar aqui o comando oficial depois que o projeto for criado.

## Supabase

Criar um projeto Supabase e configurar:

- Supabase Auth.
- Supabase Postgres.
- Supabase Storage.
- Row Level Security.
- Migrations SQL.

## Supabase Auth

No beta/MVP:

- Usar cadastro com e-mail e senha.
- Desabilitar confirmacao de e-mail para reduzir atrito.
- Usuario se cadastra, faz onboarding e acessa dashboard.

Configuracao esperada:

- Auth provider: email/password.
- Confirm email: desabilitado no MVP.
- Redirect URLs configuradas para `NEXT_PUBLIC_APP_URL`.

Futuramente, para habilitar confirmacao de e-mail:

- Ativar confirmacao no Supabase Auth.
- Criar tela/estado "confirme seu e-mail".
- Bloquear onboarding ate confirmacao, se essa for a regra adotada.
- Ajustar mensagens de cadastro e login.

## Migrations

A migration inicial deve ficar em:

```text
supabase/migrations/0001_initial_schema.sql
```

Ela deve criar:

- Todas as tabelas do MVP.
- Constraints.
- CHECK constraints.
- Indices.
- RLS.
- Policies.
- `current_business_id()`.
- `create_business_with_trial(...)`.
- Trigger de `updated_at`.
- Sequence/funcao para `payment_code`.
- Estrutura necessaria para policies de Storage.

Aplicacao esperada:

```bash
supabase db push
```

Ou via painel SQL do Supabase, se a CLI ainda nao estiver configurada.

## Supabase Storage

Bucket previsto:

```text
business-logos
```

Path previsto:

```text
{business_id}/logo.webp
```

Regras:

- Aceitar JPG, PNG e WEBP.
- Limitar tamanho do arquivo.
- Salvar no banco apenas URL/caminho em `businesses.business_logo_url`.
- Nao salvar binario no Postgres.
- No MVP, bucket pode ser publico para leitura.
- Escrita, update e delete devem ser restritos ao proprio negocio.

Observacao: o caminho acima e o `name` interno do objeto no bucket. A URL publica pode incluir `business-logos`, mas a policy de Storage avalia `bucket_id` separadamente de `name`.

Policy esperada em `storage.objects`:

```sql
bucket_id = 'business-logos'
and (storage.foldername(name))[1] = public.current_business_id()::text
```

## Primeiro Admin

Fluxo previsto:

1. Criar usuario normalmente pelo Supabase Auth.
2. Obter o `auth.users.id` desse usuario.
3. Inserir registro na tabela `admins`.

Exemplo:

```sql
insert into public.admins (user_id, role)
values ('USER_UUID_AQUI', 'owner');
```

Regras:

- O painel admin deve validar a sessao.
- O usuario precisa existir em `admins`.
- Rotas admin devem rodar server-side.
- Service role nunca deve ser exposta no frontend.

## PIX Manual

Variaveis usadas na tela de pagamento:

```env
PIX_KEY=
PIX_RECEIVER_NAME=
```

Fluxo previsto:

- Cliente escolhe plano.
- Sistema cria `payment_request`.
- Sistema gera `payment_code` no formato `PCD-00001`.
- Tela mostra chave PIX e instrucoes.
- Cliente envia comprovante por WhatsApp ou anexa futuramente.
- Admin aprova.
- Sistema ativa assinatura e define `paid_until` conforme o ciclo do plano.

Planos vigentes na Fase 9C:

- Essencial Mensal: R$ 77,00 por 30 dias.
- Pro Trimestral: R$ 87,00 por 90 dias.
- Gestao Semestral: R$ 97,00 por 180 dias.

Na implementacao da Fase 8, o fluxo manual usa:

- Rota do cliente: `/billing`.
- Rota administrativa minima: `/admin/payments`.
- Migration: `supabase/migrations/0005_manual_pix_billing.sql`.
- RPCs: `create_manual_pix_payment_request`, `approve_payment_request`, `cancel_payment_request`.

Na Fase 9B, a migration `supabase/migrations/0006_profile_uf_and_ux_fields.sql`
adiciona `businesses.state_uf` para salvar a UF do perfil da loja.

Na Fase 9C, a migration
`supabase/migrations/0007_plan_durations_menu_images_and_soft_delete.sql`
atualiza as RPCs de PIX manual para valores/duracoes por plano, adiciona
`image_url` em produtos e combos, adiciona `deleted_at` para arquivamento
logico de ingredientes/produtos/combos e cria o bucket publico `menu-images`.

Paths de imagens do cardapio:

```text
products/{business_id}/{product_id}/image.ext
combos/{business_id}/{combo_id}/image.ext
```

Para cadastrar o primeiro admin apos aplicar a migration, crie o usuario normalmente, copie o `auth.users.id` no Supabase e execute:

```sql
insert into public.admins (user_id, role)
values ('USER_UUID_AQUI', 'owner');
```

Nao ha tela para promover usuarios nesta fase.

## Testes

Usar Vitest.

Comandos esperados apos configuracao:

```bash
npm run test
npm run test:watch
```

Testes obrigatorios devem cobrir:

- Conversao de unidades.
- Custo unitario.
- `correction_factor`.
- Custos fixos.
- Taxas iFood.
- Taxa de cartao.
- Entrega gratis.
- Preco sugerido.
- CMV.
- Margem de contribuicao.
- Margem liquida estimada.
- Diagnostico.
- Saude da Operacao.
- `hasActiveAccess`.

Nenhuma fase que altere calculos deve ser considerada concluida sem testes passando.

## Versoes Instaladas

Preencher quando a Fase 1 for autorizada e as dependencias forem instaladas.

| Pacote | Versao |
| --- | --- |
| next | A definir |
| react | A definir |
| typescript | A definir |
| tailwindcss | A definir |
| @supabase/supabase-js | A definir |
| react-hook-form | A definir |
| zod | A definir |
| recharts | A definir |
| date-fns | A definir |
| lucide-react | A definir |
| vitest | A definir |
