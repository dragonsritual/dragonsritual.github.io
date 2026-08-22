export const PLATFORM_CODES = [
  "ps5-pro",
  "ps5",
  "pc",
  "browser",
  "mac",
  "other"
] as const;

export const GAME_STATUS_CODES = [
  "queued",
  "active",
  "completed",
  "paused",
  "dropped",
  "replay"
] as const;

export const SESSION_STATUS_CODES = [
  "scheduled",
  "live",
  "completed",
  "cancelled"
] as const;

export const ARTICLE_STATUS_CODES = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived"
] as const;

export const STREAM_PROVIDER_CODES = [
  "twitch",
  "youtube",
  "other"
] as const;

export const MEDIA_TYPE_CODES = [
  "image",
  "video",
  "clip",
  "audio"
] as const;

export const WORLD_LOCATION_TYPE_CODES = [
  "region",
  "town",
  "building",
  "interior",
  "landmark",
  "dungeon",
  "coordinates"
] as const;