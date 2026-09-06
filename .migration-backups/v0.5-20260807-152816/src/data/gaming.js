export const gamingData = {
  season: "2026",
  platform: "PS5 Pro",
  broadcast: {
    eyebrow: "DRAGONSRITUAL GAMING",
    title: "The Campaign Continues",
    subtitle: "Streams, sessions, stats, recaps and the queue.",
    status: "OFF AIR",
    videoUrl: ""
  },
  queue: [
    { id: "q1", title: "Ghost of Yōtei", platform: "PS5 Pro", status: "UP NEXT" },
    { id: "q2", title: "Death Stranding 2", platform: "PS5 Pro", status: "QUEUE" },
    { id: "q3", title: "Final Fantasy VII Rebirth", platform: "PS5 Pro", status: "QUEUE" }
  ],
  schedule: [
    { date: "AUG 07", game: "Ghost of Yōtei", type: "Campaign", status: "Scheduled" },
    { date: "AUG 10", game: "Death Stranding 2", type: "First Look", status: "Scheduled" },
    { date: "AUG 13", game: "Final Fantasy VII Rebirth", type: "Return", status: "Planned" }
  ],
  games: [
    {
      id: "ghost-of-yotei",
      title: "Ghost of Yōtei",
      platform: "PS5 Pro",
      status: "Active",
      sessions: 4,
      hours: 11.8,
      progress: 28,
      lastPlayed: "Aug 5",
      result: "Campaign progress",
      recapSlug: "#"
    },
    {
      id: "death-stranding-2",
      title: "Death Stranding 2",
      platform: "PS5 Pro",
      status: "Queued",
      sessions: 0,
      hours: 0,
      progress: 0,
      lastPlayed: "—",
      result: "Not started",
      recapSlug: "#"
    },
    {
      id: "ff7-rebirth",
      title: "Final Fantasy VII Rebirth",
      platform: "PS5 Pro",
      status: "Active",
      sessions: 7,
      hours: 19.4,
      progress: 41,
      lastPlayed: "Jul 29",
      result: "Story progress",
      recapSlug: "#"
    }
  ]
};
