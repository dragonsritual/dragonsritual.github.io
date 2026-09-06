import { dataService, activeDataProvider } from "./dataService";
import { seedData } from "../data/seed";
import { createSupabaseClient, hasSupabaseConfig } from "../lib/supabase";

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

async function getPlatformNames() {
  if (activeDataProvider === "supabase" && hasSupabaseConfig()) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("platforms")
      .select("id,name");

    if (error) throw error;

    return new Map((data ?? []).map((platform) => [platform.id, platform.name]));
  }

  return new Map(
    seedData.platforms.map((platform) => [platform.id, platform.name])
  );
}

export async function getGamingDashboard() {
  const games = await dataService.listGames();
  const platformMap = await getPlatformNames();

  return {
    season: "2026",
    platform: "PS5 Pro",
    provider: activeDataProvider,

    queue: games
      .filter((game) => game.status === "queued" || game.status === "active")
      .slice(0, 3)
      .map((game, index) => ({
        id: game.id,
        title: game.title,
        platform: platformMap.get(game.platformId) ?? "Unknown",
        status: index === 0 ? "UP NEXT" : "QUEUE"
      })),

    // Schedule remains local until we begin entering actual Sessions.
    schedule: [
      {
        date: "AUG 07",
        game: "Ghost of Yōtei",
        type: "Campaign",
        status: "Scheduled"
      },
      {
        date: "AUG 10",
        game: "Death Stranding 2",
        type: "First Look",
        status: "Scheduled"
      },
      {
        date: "AUG 13",
        game: "Final Fantasy VII Rebirth",
        type: "Return",
        status: "Planned"
      }
    ],

    games: games.map((game) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      platform: platformMap.get(game.platformId) ?? "Unknown",
      status:
        game.status === "active"
          ? "Active"
          : game.status === "queued"
            ? "Queued"
            : game.status,
      sessions: game.sessionCount,
      hours: game.hoursPlayed,
      progress: game.progressPercent,
      lastPlayed: formatDate(game.lastPlayedAt),
      result: game.currentObjective ?? "—"
    }))
  };
}