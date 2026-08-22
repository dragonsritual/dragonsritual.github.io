import type { DatabaseSeed } from "./schemas";

export function validateRelationships(data: DatabaseSeed) {
  const errors: string[] = [];

  const ids = <T extends { id: string }>(items: T[]) =>
    new Set(items.map((item) => item.id));

  const platformIds = ids(data.platforms);
  const gameIds = ids(data.games);
  const sessionIds = ids(data.sessions);
  const streamIds = ids(data.streams);
  const articleIds = ids(data.articles);
  const authorIds = ids(data.authors);
  const mediaIds = ids(data.media);
  const tagIds = ids(data.tags);
  const categoryIds = ids(data.categories);
  const locationIds = ids(data.worldLocations);

  for (const game of data.games) {
    if (!platformIds.has(game.platformId)) {
      errors.push(`Game ${game.id} references missing platform ${game.platformId}`);
    }

    for (const value of game.tagIds) {
      if (!tagIds.has(value)) errors.push(`Game ${game.id} references missing tag ${value}`);
    }

    for (const value of game.categoryIds) {
      if (!categoryIds.has(value)) errors.push(`Game ${game.id} references missing category ${value}`);
    }

    if (game.coverMediaId && !mediaIds.has(game.coverMediaId)) {
      errors.push(`Game ${game.id} references missing cover media ${game.coverMediaId}`);
    }
  }

  for (const session of data.sessions) {
    if (!gameIds.has(session.gameId)) {
      errors.push(`Session ${session.id} references missing game ${session.gameId}`);
    }

    if (session.streamId && !streamIds.has(session.streamId)) {
      errors.push(`Session ${session.id} references missing stream ${session.streamId}`);
    }

    if (session.articleId && !articleIds.has(session.articleId)) {
      errors.push(`Session ${session.id} references missing article ${session.articleId}`);
    }

    if (session.worldLocationId && !locationIds.has(session.worldLocationId)) {
      errors.push(`Session ${session.id} references missing world location ${session.worldLocationId}`);
    }

    for (const value of session.mediaIds) {
      if (!mediaIds.has(value)) errors.push(`Session ${session.id} references missing media ${value}`);
    }
  }

  for (const article of data.articles) {
    if (!authorIds.has(article.authorId)) {
      errors.push(`Article ${article.id} references missing author ${article.authorId}`);
    }

    for (const value of article.relatedGameIds) {
      if (!gameIds.has(value)) errors.push(`Article ${article.id} references missing game ${value}`);
    }

    for (const value of article.relatedSessionIds) {
      if (!sessionIds.has(value)) errors.push(`Article ${article.id} references missing session ${value}`);
    }

    for (const value of article.tagIds) {
      if (!tagIds.has(value)) errors.push(`Article ${article.id} references missing tag ${value}`);
    }

    for (const value of article.categoryIds) {
      if (!categoryIds.has(value)) errors.push(`Article ${article.id} references missing category ${value}`);
    }

    if (article.heroMediaId && !mediaIds.has(article.heroMediaId)) {
      errors.push(`Article ${article.id} references missing hero media ${article.heroMediaId}`);
    }
  }

  for (const media of data.media) {
    if (media.gameId && !gameIds.has(media.gameId)) {
      errors.push(`Media ${media.id} references missing game ${media.gameId}`);
    }

    if (media.sessionId && !sessionIds.has(media.sessionId)) {
      errors.push(`Media ${media.id} references missing session ${media.sessionId}`);
    }

    if (media.worldLocationId && !locationIds.has(media.worldLocationId)) {
      errors.push(`Media ${media.id} references missing world location ${media.worldLocationId}`);
    }
  }

  for (const location of data.worldLocations) {
    if (location.gameId && !gameIds.has(location.gameId)) {
      errors.push(`World location ${location.id} references missing game ${location.gameId}`);
    }

    if (location.parentLocationId && !locationIds.has(location.parentLocationId)) {
      errors.push(`World location ${location.id} references missing parent ${location.parentLocationId}`);
    }
  }

  return errors;
}