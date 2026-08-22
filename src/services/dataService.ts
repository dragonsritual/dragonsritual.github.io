import { localDataSource } from "../data/localDataSource";
import { supabaseDataSource } from "../data/supabaseDataSource";
import { hasSupabaseConfig } from "../lib/supabase";
import type { DragonsRitualDataSource } from "../data/dataSource";

const requestedProvider =
  import.meta.env.PUBLIC_DR_DATA_PROVIDER?.toLowerCase() ?? "local";

const useSupabase =
  requestedProvider === "supabase" && hasSupabaseConfig();

export const dataService: DragonsRitualDataSource =
  useSupabase ? supabaseDataSource : localDataSource;

export const activeDataProvider = useSupabase ? "supabase" : "local";