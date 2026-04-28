import { supabase } from "@/integrations/supabase/client";
import type { SimulatorPayload } from "@/pages/KickoffSimulator";

export interface SavedSimulation {
  id: string;
  user_id: string;
  file_name: string;
  total_rows: number;
  supported_count: number;
  payload: SimulatorPayload;
  created_at: string;
  updated_at: string;
}

export const simulatorService = {
  async save(payload: SimulatorPayload): Promise<SavedSimulation | null> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    const supportedCount = payload.results.filter((r) => r.response?.supported).length;

    const { data, error } = await supabase
      .from("simulator_simulations")
      .insert({
        user_id: user.id,
        file_name: payload.fileName,
        total_rows: payload.results.length,
        supported_count: supportedCount,
        payload: payload as any,
      })
      .select()
      .single();

    if (error) {
      console.error("[simulatorService.save]", error);
      return null;
    }
    return data as unknown as SavedSimulation;
  },

  async list(): Promise<SavedSimulation[]> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from("simulator_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[simulatorService.list]", error);
      return [];
    }
    return (data || []) as unknown as SavedSimulation[];
  },

  async getById(id: string): Promise<SavedSimulation | null> {
    const { data, error } = await supabase
      .from("simulator_simulations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[simulatorService.getById]", error);
      return null;
    }
    return data as unknown as SavedSimulation | null;
  },

  async getLatest(): Promise<SavedSimulation | null> {
    const list = await this.list();
    return list[0] ?? null;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase.from("simulator_simulations").delete().eq("id", id);
    if (error) {
      console.error("[simulatorService.remove]", error);
      return false;
    }
    return true;
  },
};
