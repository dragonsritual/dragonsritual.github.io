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

function formatScheduleDate(value: string | null) {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit"
  })
    .format(date)
    .toUpperCase();
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
  const [games, upcomingSessions] = await Promise.all([
    dataService.listGames(),
    dataService.listUpcomingSessions()
  ]);

  const platformMap = await getPlatformNames();
  const gameMap = new Map(games.map((game) => [game.id, game]));

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

    schedule: upcomingSessions.slice(0, 4).map((session) => {
      const game = gameMap.get(session.gameId);

      return {
        id: session.id,
        date: formatScheduleDate(session.scheduledFor),
        game: game?.title ?? "Unknown Game",
        type: session.result || session.title,
        status:
          session.status === "live"
            ? "Live"
            : session.status === "scheduled"
              ? "Scheduled"
              : session.status
      };
    }),

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