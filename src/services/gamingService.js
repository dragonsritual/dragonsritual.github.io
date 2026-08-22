import { gamingData } from "../data/gaming.js";

export async function getGamingDashboard() {
  // v0.1 uses local structured data.
  // Later this function can call Supabase/PostgreSQL/API without rewriting UI components.
  return structuredClone(gamingData);
}
