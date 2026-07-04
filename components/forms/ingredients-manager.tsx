"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateIngredientUnitCost,
} from "@/lib/calculations/ingredients";
import { formatCurrency, parseBrazilianNumber } from "@/lib/calculations/money";
import { type Unit } from "@/lib/calculations/units";
import { createClient } from "@/lib/supabase/client";
import {
  ingredientSchema,
  type IngredientInput,
} from "@/lib/validations/ingredients";

export type IngredientRow = {
  id: string;
  name: string;
  category: string | null;
  supplier: string | null;
  purchase_price: number;
  purchase_quantity: number;
  purchase_unit: Unit;
  usage_unit: Unit;
  correction_factor: number;
  unit_cost: number;
  last_price_update: string | null;
  active: boolean;
};

type IngredientsManagerProps = {
  initialIngredients: IngredientRow[];
};

const defaultValues: IngredientInput = {
  name: "",
  category: "",
  supplier: "",
  purchasePrice: "",
  purchaseQuantity: "",
  purchaseUnit: "kg",
  usageUnit: "g",
  correctionFactor: "1,00",
  active: true,
};

export function IngredientsManager({ initialIngredients }: IngredientsManagerProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createForm = useIngredientForm(defaultValues);
  const editForm = useIngredientForm(defaultValues);

  async function saveIngredient(values: IngredientInput, ingredientId?: string) {
    setMessage(null);
    setError(null);

    let parsed;
    try {
      parsed = parseIngredientInput(values);
      calculateIngredientUnitCost(parsed);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Dados invalidos.");
      return;
    }

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "save_ingredient_with_history",
      {
        p_ingredient_id: ingredientId ?? null,
        p_name: values.name,
        p_category: values.category || null,
        p_supplier: values.supplier || null,
        p_purchase_price: parsed.purchasePrice,
        p_purchase_quantity: parsed.purchaseQuantity,
        p_purchase_unit: parsed.purchaseUnit,
        p_usage_unit: parsed.usageUnit,
        p_correction_factor: parsed.correctionFactor,
        p_active: values.active,
      },
    );

    if (rpcError) {
      setError(`Nao foi possivel salvar o ingrediente: ${rpcError.message}`);
      return;
    }

    const saved = (data as { ingredient: IngredientRow }).ingredient;

    if (ingredientId) {
      setIngredients((current) =>
        current.map((ingredient) => (ingredient.id === ingredientId ? saved : ingredient)),
      );
      setEditingId(null);
      setMessage("Ingrediente salvo.");
      return;
    }

    setIngredients((current) => [saved, ...current]);
    createForm.reset(defaultValues);
    setMessage("Ingrediente criado com historico de preco.");
  }

  function startEditing(ingredient: IngredientRow) {
    setEditingId(ingredient.id);
    editForm.reset({
      name: ingredient.name,
      category: ingredient.category ?? "",
      supplier: ingredient.supplier ?? "",
      purchasePrice: String(ingredient.purchase_price).replace(".", ","),
      purchaseQuantity: String(ingredient.purchase_quantity).replace(".", ","),
      purchaseUnit: ingredient.purchase_unit,
      usageUnit: ingredient.usage_unit,
      correctionFactor: String(ingredient.correction_factor).replace(".", ","),
      active: ingredient.active,
    });
  }

  async function setActive(ingredient: IngredientRow, active: boolean) {
    await saveIngredient(
      {
        name: ingredient.name,
        category: ingredient.category ?? "",
        supplier: ingredient.supplier ?? "",
        purchasePrice: String(ingredient.purchase_price),
        purchaseQuantity: String(ingredient.purchase_quantity),
        purchaseUnit: ingredient.purchase_unit,
        usageUnit: ingredient.usage_unit,
        correctionFactor: String(ingredient.correction_factor),
        active,
      },
      ingredient.id,
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <IngredientForm
        form={createForm}
        title="Novo ingrediente"
        submitLabel="Criar ingrediente"
        onSubmit={(values) => saveIngredient(values)}
      />

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Compra</th>
              <th className="p-3 font-medium">Uso</th>
              <th className="p-3 font-medium">Custo unitario</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                  Cadastre seu primeiro ingrediente para comecar a montar fichas tecnicas.
                </td>
              </tr>
            ) : (
              ingredients.map((ingredient) =>
                editingId === ingredient.id ? (
                  <tr key={ingredient.id} className="border-t">
                    <td colSpan={6} className="p-3">
                      <IngredientForm
                        form={editForm}
                        title="Editar ingrediente"
                        submitLabel="Salvar ingrediente"
                        onSubmit={(values) => saveIngredient(values, ingredient.id)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={ingredient.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{ingredient.name}</div>
                      <div className="text-muted-foreground">
                        {[ingredient.category, ingredient.supplier].filter(Boolean).join(" - ") ||
                          "Sem categoria"}
                      </div>
                    </td>
                    <td className="p-3">
                      {formatCurrency(ingredient.purchase_price)} /{" "}
                      {ingredient.purchase_quantity} {ingredient.purchase_unit}
                    </td>
                    <td className="p-3">{ingredient.usage_unit}</td>
                    <td className="p-3">
                      {formatCurrency(ingredient.unit_cost)} por {ingredient.usage_unit}
                    </td>
                    <td className="p-3">{ingredient.active ? "Ativo" : "Inativo"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActive(ingredient, !ingredient.active)}
                        >
                          {ingredient.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startEditing(ingredient)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useIngredientForm(values: IngredientInput) {
  return useForm<IngredientInput>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: values,
  });
}

type IngredientFormProps = {
  form: ReturnType<typeof useIngredientForm>;
  title: string;
  submitLabel: string;
  onSubmit: (values: IngredientInput) => void;
  onCancel?: () => void;
};

function IngredientForm({
  form,
  title,
  submitLabel,
  onSubmit,
  onCancel,
}: IngredientFormProps) {
  const watchedValues = useWatch({ control: form.control });
  const preview = useMemo(() => {
    try {
      const parsed = parseIngredientInput({
        ...defaultValues,
        ...watchedValues,
      } as IngredientInput);
      const unitCost = calculateIngredientUnitCost(parsed);
      return {
        error: null,
        text: `${formatCurrency(unitCost)} por ${parsed.usageUnit}`,
      };
    } catch (previewError) {
      return {
        error: previewError instanceof Error ? previewError.message : "Dados incompletos.",
        text: "Preencha os dados para calcular.",
      };
    }
  }, [watchedValues]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            O custo unitario e calculado automaticamente e nao pode ser editado.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Custo unitario</p>
          <p className="font-semibold">{preview.text}</p>
        </div>
      </div>

      {preview.error ? (
        <Alert className="mb-4">
          <AlertDescription>{preview.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <TextField id="name" label="Nome" register={form.register("name")} error={form.formState.errors.name?.message} />
        <TextField id="category" label="Categoria" register={form.register("category")} />
        <TextField id="supplier" label="Fornecedor" register={form.register("supplier")} />
        <TextField
          id="purchasePrice"
          label="Preco pago"
          register={form.register("purchasePrice")}
          error={form.formState.errors.purchasePrice?.message}
          placeholder="40,00"
        />
        <TextField
          id="purchaseQuantity"
          label="Quantidade comprada"
          register={form.register("purchaseQuantity")}
          error={form.formState.errors.purchaseQuantity?.message}
          placeholder="1,00"
        />
        <SelectField
          id="purchaseUnit"
          label="Unidade de compra"
          register={form.register("purchaseUnit")}
        />
        <SelectField
          id="usageUnit"
          label="Unidade de uso"
          register={form.register("usageUnit")}
        />
        <TextField
          id="correctionFactor"
          label="Fator de correcao"
          register={form.register("correctionFactor")}
          error={form.formState.errors.correctionFactor?.message}
          placeholder="1,00"
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" {...form.register("active")} />
          Ativo
        </label>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Use 1,00 se nao houver perda. Use 1,10 se o ingrediente fica cerca de
        10% mais caro apos limpeza, preparo ou rendimento.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">
          <Plus />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function parseIngredientInput(values: IngredientInput) {
  return {
    purchasePrice: parseBrazilianNumber(values.purchasePrice),
    purchaseQuantity: parseBrazilianNumber(values.purchaseQuantity),
    purchaseUnit: values.purchaseUnit,
    usageUnit: values.usageUnit,
    correctionFactor: parseBrazilianNumber(values.correctionFactor),
  };
}

function TextField({
  id,
  label,
  register,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  register: object;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} {...register} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  register,
}: {
  id: string;
  label: string;
  register: object;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...register}>
        <option value="kg">kg</option>
        <option value="g">g</option>
        <option value="l">l</option>
        <option value="ml">ml</option>
        <option value="un">un</option>
      </select>
    </div>
  );
}
