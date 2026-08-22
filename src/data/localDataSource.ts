import { databaseSeedSchema } from "../domain/schemas";
import { validateRelationships } from "../domain/validateRelationships";
import { seedData } from "./seed";
import type { DragonsRitualDataSource } from "./dataSource";

const parsed = databaseSeedSchema.parse(seedData);
const relationshipErrors = validateRelationships(parsed);

if (relationshipErrors.length > 0) {
  throw new Error(
    `DragonsRitual data relationship validation failed:\n${relationshipErrors.join("\n")}`
  );
}

export const localDataSource: DragonsRitualDataSource = {
  async listGames() {
    return [...parsed.games];
  },

  async getGameBySlug(slug) {
    return parsed.games.find((game) => game.slug === slug) ?? null;
  },

  async listSessionsForGame(gameId) {
    return parsed.sessions
      .filter((session) => session.gameId === gameId)
      .sort((a, b) => b.sequence - a.sequence);
  },

  async listUpcomingSessions() {
    return parsed.sessions
      .filter((session) => session.status === "scheduled")
      .sort((a, b) =>
        String(a.scheduledFor ?? "").localeCompare(String(b.scheduledFor ?? ""))
      );
  },

  async listArticles() {
    return [...parsed.articles];
  },

  async getArticleBySlug(slug) {
    return parsed.articles.find((article) => article.slug === slug) ?? null;
  },

  async getStream(id) {
    return parsed.streams.find((stream) => stream.id === id) ?? null;
  },

  async getWorldLocation(id) {
    return parsed.worldLocations.find((location) => location.id === id) ?? null;
  }
};