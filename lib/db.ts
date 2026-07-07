import { supabase } from "./supabase";

export interface Reading {
  id: number;
  moisture: number;
  created_at: string;
}

export async function addReading(moisture: number): Promise<void> {
  const { error } = await supabase.from("readings").insert({ moisture });
  if (error) throw error;
}

export async function getLatestReading(): Promise<Reading | null> {
  const { data } = await supabase
    .from("readings")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getHistory(limit: number = 50): Promise<Reading[]> {
  const { data } = await supabase
    .from("readings")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getTotalReadings(): Promise<number> {
  const { count, error } = await supabase
    .from("readings")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}
