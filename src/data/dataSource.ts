import type {
  Article,
  Game,
  Session,
  Stream,
  WorldLocation
} from "../domain/schemas";

export interface DragonsRitualDataSource {
  listGames(): Promise<Game[]>;
  getGameBySlug(slug: string): Promise<Game | null>;
  listSessionsForGame(gameId: string): Promise<Session[]>;
  listUpcomingSessions(): Promise<Session[]>;
  listArticles(): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | null>;
  getStream(id: string): Promise<Stream | null>;
  getWorldLocation(id: string): Promise<WorldLocation | null>;
}