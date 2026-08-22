import { z } from "zod";
import {
  ARTICLE_STATUS_CODES,
  GAME_STATUS_CODES,
  MEDIA_TYPE_CODES,
  PLATFORM_CODES,
  SESSION_STATUS_CODES,
  STREAM_PROVIDER_CODES,
  WORLD_LOCATION_TYPE_CODES
} from "./constants";

const id = z.string().min(2);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const url = z.string().url();

export const platformSchema = z.object({
  id,
  code: z.enum(PLATFORM_CODES),
  name: z.string().min(1),
  manufacturer: z.string().nullable().default(null),
  active: z.boolean().default(true)
});

export const tagSchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  description: z.string().nullable().default(null)
});

export const categorySchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  description: z.string().nullable().default(null)
});

export const worldLocationSchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  type: z.enum(WORLD_LOCATION_TYPE_CODES),
  gameId: id.nullable().default(null),
  parentLocationId: id.nullable().default(null),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }).nullable().default(null),
  deepLink: z.string().nullable().default(null)
});

export const gameSchema = z.object({
  id,
  slug,
  title: z.string().min(1),
  platformId: id,
  status: z.enum(GAME_STATUS_CODES),
  releaseDate: z.string().nullable().default(null),
  developer: z.string().nullable().default(null),
  publisher: z.string().nullable().default(null),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  hoursPlayed: z.number().nonnegative().default(0),
  progressPercent: z.number().min(0).max(100).default(0),
  sessionCount: z.number().int().nonnegative().default(0),
  lastPlayedAt: z.string().nullable().default(null),
  currentObjective: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  coverMediaId: id.nullable().default(null),
  tagIds: z.array(id).default([]),
  categoryIds: z.array(id).default([])
});

export const streamSchema = z.object({
  id,
  provider: z.enum(STREAM_PROVIDER_CODES),
  channel: z.string().min(1),
  liveUrl: url,
  vodUrl: url.nullable().default(null),
  externalId: z.string().nullable().default(null),
  startedAt: isoDateTime.nullable().default(null),
  endedAt: isoDateTime.nullable().default(null)
});

export const sessionSchema = z.object({
  id,
  gameId: id,
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  status: z.enum(SESSION_STATUS_CODES),
  scheduledFor: isoDateTime.nullable().default(null),
  startedAt: isoDateTime.nullable().default(null),
  endedAt: isoDateTime.nullable().default(null),
  durationMinutes: z.number().int().nonnegative().default(0),
  progressBefore: z.number().min(0).max(100).nullable().default(null),
  progressAfter: z.number().min(0).max(100).nullable().default(null),
  result: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  streamId: id.nullable().default(null),
  articleId: id.nullable().default(null),
  worldLocationId: id.nullable().default(null),
  mediaIds: z.array(id).default([]),
  tagIds: z.array(id).default([])
});

export const articleSchema = z.object({
  id,
  slug,
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  excerpt: z.string().nullable().default(null),
  status: z.enum(ARTICLE_STATUS_CODES),
  authorId: id,
  publishedAt: isoDateTime.nullable().default(null),
  scheduledFor: isoDateTime.nullable().default(null),
  heroMediaId: id.nullable().default(null),
  relatedGameIds: z.array(id).default([]),
  relatedSessionIds: z.array(id).default([]),
  tagIds: z.array(id).default([]),
  categoryIds: z.array(id).default([]),
  seo: z.object({
    title: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    socialImageMediaId: id.nullable().default(null),
    canonicalUrl: url.nullable().default(null)
  }).default({})
});

export const authorSchema = z.object({
  id,
  slug,
  displayName: z.string().min(1),
  bio: z.string().nullable().default(null),
  avatarMediaId: id.nullable().default(null)
});

export const mediaSchema = z.object({
  id,
  type: z.enum(MEDIA_TYPE_CODES),
  title: z.string().nullable().default(null),
  alt: z.string().nullable().default(null),
  url,
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  durationSeconds: z.number().nonnegative().nullable().default(null),
  capturedAt: isoDateTime.nullable().default(null),
  gameId: id.nullable().default(null),
  sessionId: id.nullable().default(null),
  worldLocationId: id.nullable().default(null)
});

export const databaseSeedSchema = z.object({
  platforms: z.array(platformSchema),
  tags: z.array(tagSchema),
  categories: z.array(categorySchema),
  authors: z.array(authorSchema),
  games: z.array(gameSchema),
  streams: z.array(streamSchema),
  sessions: z.array(sessionSchema),
  articles: z.array(articleSchema),
  media: z.array(mediaSchema),
  worldLocations: z.array(worldLocationSchema)
});

export type Platform = z.infer<typeof platformSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Author = z.infer<typeof authorSchema>;
export type Game = z.infer<typeof gameSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Media = z.infer<typeof mediaSchema>;
export type WorldLocation = z.infer<typeof worldLocationSchema>;
export type DatabaseSeed = z.infer<typeof databaseSeedSchema>;