import { supabase } from "@/integrations/supabase/client";

export type ProductionCheckStage = "counting" | "verification";

export interface ExpectedProductionItem {
  key: string;
  category: string;
  name: string;
  quantity: number;
}

export interface ProductionCheckItem {
  id?: string;
  kit_schedule_id: string;
  stage: ProductionCheckStage;
  item_key: string;
  item_category: string;
  item_name: string;
  expected_quantity: number;
  counted_quantity: number;
  is_checked: boolean;
  created_by: string;
  checked_by?: string | null;
  checked_at?: string | null;
}

export const loadProductionChecks = async (
  scheduleId: string,
  stage: ProductionCheckStage,
): Promise<ProductionCheckItem[]> => {
  const { data, error } = await supabase
    .from("production_check_items")
    .select("*")
    .eq("kit_schedule_id", scheduleId)
    .eq("stage", stage)
    .order("item_category")
    .order("item_name");

  if (error) throw error;
  return data ?? [];
};

export const saveProductionChecks = async (
  scheduleId: string,
  stage: ProductionCheckStage,
  items: ExpectedProductionItem[],
  quantities: Record<string, number>,
  checked: Record<string, boolean>,
) => {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");

  const now = new Date().toISOString();
  const rows = items.map((item) => ({
    kit_schedule_id: scheduleId,
    stage,
    item_key: item.key,
    item_category: item.category,
    item_name: item.name,
    expected_quantity: item.quantity,
    counted_quantity: quantities[item.key] ?? 0,
    is_checked: checked[item.key] ?? false,
    created_by: userId,
    checked_by: checked[item.key] ? userId : null,
    checked_at: checked[item.key] ? now : null,
  }));

  const { error } = await supabase
    .from("production_check_items")
    .upsert(rows, { onConflict: "kit_schedule_id,stage,item_key" });
  if (error) throw error;
};

export const updateProductionStage = async (scheduleId: string, status: string) => {
  const { data, error } = await supabase
    .from("kit_schedules")
    .update({ status })
    .eq("id", scheduleId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
};