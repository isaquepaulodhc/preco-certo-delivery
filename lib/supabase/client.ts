"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv } from "@/lib/env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = assertSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
