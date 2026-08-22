import type { DatabaseSeed } from "../domain/schemas";

export const seedData: DatabaseSeed = {
  platforms: [
    {
      id: "platform-ps5-pro",
      code: "ps5-pro",
      name: "PlayStation 5 Pro",
      manufacturer: "Sony",
      active: true
    }
  ],

  tags: [
    {
      id: "tag-campaign",
      slug: "campaign",
      name: "Campaign",
      description: "Main campaign play sessions."
    }
  ],

  categories: [
    {
      id: "category-gaming",
      slug: "gaming",
      name: "Gaming",
      description: "DragonsRitual gaming coverage."
    }
  ],

  authors: [
    {
      id: "author-dragonsritual",
      slug: "dragonsritual",
      displayName: "DragonsRitual",
      bio: null,
      avatarMediaId: null
    }
  ],

  games: [
    {
      id: "game-ghost-of-yotei",
      slug: "ghost-of-yotei",
      title: "Ghost of Yōtei",
      platformId: "platform-ps5-pro",
      status: "active",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: "2026-08-01",
      completedAt: null,
      hoursPlayed: 11.8,
      progressPercent: 28,
      sessionCount: 4,
      lastPlayedAt: "2026-08-05",
      currentObjective: "Campaign progress",
      summary: null,
      coverMediaId: null,
      tagIds: ["tag-campaign"],
      categoryIds: ["category-gaming"]
    },
    {
      id: "game-death-stranding-2",
      slug: "death-stranding-2",
      title: "Death Stranding 2",
      platformId: "platform-ps5-pro",
      status: "queued",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: null,
      completedAt: null,
      hoursPlayed: 0,
      progressPercent: 0,
      sessionCount: 0,
      lastPlayedAt: null,
      currentObjective: "Not started",
      summary: null,
      coverMediaId: null,
      tagIds: [],
      categoryIds: ["category-gaming"]
    },
    {
      id: "game-ff7-rebirth",
      slug: "final-fantasy-vii-rebirth",
      title: "Final Fantasy VII Rebirth",
      platformId: "platform-ps5-pro",
      status: "active",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: null,
      completedAt: null,
      hoursPlayed: 19.4,
      progressPercent: 41,
      sessionCount: 7,
      lastPlayedAt: "2026-07-29",
      currentObjective: "Story progress",
      summary: null,
      coverMediaId: null,
      tagIds: ["tag-campaign"],
      categoryIds: ["category-gaming"]
    }
  ],

  streams: [
    {
      id: "stream-twitch-live",
      provider: "twitch",
      channel: "dragonsritual",
      liveUrl: "https://www.twitch.tv/dragonsritual",
      vodUrl: null,
      externalId: null,
      startedAt: null,
      endedAt: null
    }
  ],

  sessions: [
    {
      id: "session-ghost-004",
      gameId: "game-ghost-of-yotei",
      sequence: 4,
      title: "Ghost of Yōtei — Session 4",
      status: "completed",
      scheduledFor: null,
      startedAt: "2026-08-05T19:00:00-04:00",
      endedAt: "2026-08-05T21:30:00-04:00",
      durationMinutes: 150,
      progressBefore: 22,
      progressAfter: 28,
      result: "Campaign progress",
      notes: null,
      streamId: null,
      articleId: null,
      worldLocationId: null,
      mediaIds: [],
      tagIds: ["tag-campaign"]
    }
  ],

  articles: [],

  media: [],

  worldLocations: []
};