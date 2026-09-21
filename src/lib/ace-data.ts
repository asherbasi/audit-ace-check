import { supabase } from "@/integrations/supabase/client";
import type { AuditAnswer, ChecklistItem } from "./scoring";

export interface Store {
  id: string;
  name: string;
  code: string;
  region: string | null;
}

export interface Audit {
  id: string;
  store_id: string;
  period: string;
  date: string;
  rgm: string | null;
  arm: string | null;
  unit_head: string | null;
  conducted_by: string | null;
  status: "draft" | "completed";
  created_at: string;
}

export async function fetchStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, code, region")
    .order("code");
  if (error) throw error;
  return (data ?? []) as Store[];
}

export async function fetchChecklist(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("id, section, section_order, item_order, code, text, weight, hint")
    .order("section_order")
    .order("item_order");
  if (error) throw error;
  return (data ?? []) as ChecklistItem[];
}

export async function fetchAudits(storeId?: string): Promise<Audit[]> {
  let query = supabase
    .from("audits")
    .select("id, store_id, period, date, rgm, arm, unit_head, conducted_by, status, created_at")
    .order("date", { ascending: false });
  if (storeId) query = query.eq("store_id", storeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Audit[];
}

export async function fetchAudit(auditId: string): Promise<Audit> {
  const { data, error } = await supabase
    .from("audits")
    .select("id, store_id, period, date, rgm, arm, unit_head, conducted_by, status, created_at")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Audit not found");
  return data as Audit;
}

export async function fetchAnswers(auditId: string): Promise<AuditAnswer[]> {
  const { data, error } = await supabase
    .from("audit_answers")
    .select("item_id, answer, note")
    .eq("audit_id", auditId);
  if (error) throw error;
  return (data ?? []) as AuditAnswer[];
}

export async function fetchAllAnswers(auditIds: string[]): Promise<Record<string, AuditAnswer[]>> {
  if (auditIds.length === 0) return {};
  const { data, error } = await supabase
    .from("audit_answers")
    .select("audit_id, item_id, answer, note")
    .in("audit_id", auditIds);
  if (error) throw error;
  const grouped: Record<string, AuditAnswer[]> = {};
  for (const row of (data ?? []) as (AuditAnswer & { audit_id: string })[]) {
    (grouped[row.audit_id] ??= []).push({ item_id: row.item_id, answer: row.answer, note: row.note });
  }
  return grouped;
}

export async function createAudit(input: {
  store_id: string;
  period: string;
  date: string;
  conducted_by?: string | null;
}): Promise<Audit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("audits")
    .insert({ ...input, created_by: userData.user?.id ?? null })
    .select("id, store_id, period, date, rgm, arm, unit_head, conducted_by, status, created_at")
    .single();
  if (error) throw error;
  return data as Audit;
}

export async function saveAnswer(input: {
  audit_id: string;
  item_id: string;
  answer: string;
  note: string | null;
}) {
  const { error } = await supabase
    .from("audit_answers")
    .upsert(input, { onConflict: "audit_id,item_id" });
  if (error) throw error;
}

export async function updateAudit(auditId: string, patch: Partial<Audit>) {
  const { error } = await supabase.from("audits").update(patch).eq("id", auditId);
  if (error) throw error;
}

export interface MyProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  store_id: string | null;
  isAdmin: boolean;
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, store_id").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    full_name: profile?.full_name ?? null,
    store_id: profile?.store_id ?? null,
    isAdmin: (roles ?? []).some((r: { role: string }) => r.role === "admin"),
  };
}
