import type { DragonsRitualDataSource } from "./dataSource";
import type {
  Article,
  Game,
  Session,
  Stream,
  WorldLocation
} from "../domain/schemas";
import { createSupabaseClient } from "../lib/supabase";

function gameStatus(value: string): Game["status"] {
  return value as Game["status"];
}

function sessionStatus(value: string): Session["status"] {
  return value as Session["status"];
}

export const supabaseDataSource: DragonsRitualDataSource = {
  async listGames() {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("games")
      .select(`
        id,
        slug,
        title,
        platform_id,
        status,
        release_date,
        developer,
        publisher,
        started_at,
        completed_at,
        hours_played,
        progress_percent,
        session_count,
        last_played_at,
        current_objective,
        summary,
        cover_url
      `)
      .order("title");

    if (error) throw error;

    return (data ?? []).map((row): Game => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      platformId: row.platform_id,
      status: gameStatus(row.status),
      releaseDate: row.release_date,
      developer: row.developer,
      publisher: row.publisher,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      hoursPlayed: Number(row.hours_played ?? 0),
      progressPercent: Number(row.progress_percent ?? 0),
      sessionCount: Number(row.session_count ?? 0),
      lastPlayedAt: row.last_played_at,
      currentObjective: row.current_objective,
      summary: row.summary,
      coverMediaId: null,
      tagIds: [],
      categoryIds: []
    }));
  },

  async getGameBySlug(slug) {
    const games = await this.listGames();
    return games.find((game) => game.slug === slug) ?? null;
  },

  async listSessionsForGame(gameId) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("game_id", gameId)
      .order("sequence", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row): Session => ({
      id: row.id,
      gameId: row.game_id,
      sequence: row.sequence,
      title: row.title,
      status: sessionStatus(row.status),
      scheduledFor: row.scheduled_for,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes ?? 0,
      progressBefore: row.progress_before == null ? null : Number(row.progress_before),
      progressAfter: row.progress_after == null ? null : Number(row.progress_after),
      result: row.result,
      notes: row.notes,
      streamId: row.stream_id,
      articleId: null,
      worldLocationId: row.world_location_id,
      mediaIds: [],
      tagIds: []
    }));
  },

  async listUpcomingSessions() {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "scheduled")
      .order("scheduled_for", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row): Session => ({
      id: row.id,
      gameId: row.game_id,
      sequence: row.sequence,
      title: row.title,
      status: sessionStatus(row.status),
      scheduledFor: row.scheduled_for,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes ?? 0,
      progressBefore: row.progress_before == null ? null : Number(row.progress_before),
      progressAfter: row.progress_after == null ? null : Number(row.progress_after),
      result: row.result,
      notes: row.notes,
      streamId: row.stream_id,
      articleId: null,
      worldLocationId: row.world_location_id,
      mediaIds: [],
      tagIds: []
    }));
  },

  async listArticles(): Promise<Article[]> {
    // Article body/editorial workflow will come from Sanity in v0.7.
    return [];
  },

  async getArticleBySlug(_slug): Promise<Article | null> {
    return null;
  },

  async getStream(id) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("streams")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      provider: data.provider as Stream["provider"],
      channel: data.channel,
      liveUrl: data.live_url,
      vodUrl: data.vod_url,
      externalId: data.external_id,
      startedAt: data.started_at,
      endedAt: data.ended_at
    };
  },

  async getWorldLocation(id) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("world_locations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      type: data.location_type as WorldLocation["type"],
      gameId: data.game_id,
      parentLocationId: data.parent_location_id,
      coordinates:
        data.x == null || data.y == null || data.z == null
          ? null
          : { x: data.x, y: data.y, z: data.z },
      deepLink: data.deep_link
    };
  }
};