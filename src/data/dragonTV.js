export const dragonTV = {
  provider: "twitch",
  channel: "dragonsritual",
  discordInvite: "",
  discordChannelName: "dragon-tv-live",
  station: "DRAGON TV",
  status: "STANDBY",
  program: "PS5 PRO / TWITCH",

  channels: [
    { id:"main", label:"CH 01", title:"DRAGON TV", type:"LIVE / MIXED", active:true },
    { id:"creator", label:"CH 02", title:"CREATOR FEED", type:"ART / TALK / PERFORMANCE", active:false },
    { id:"events", label:"CH 03", title:"EVENTS", type:"INTERVIEWS / SPECIALS", active:false }
  ],

  transmission: {
    title: "DRAGON TV",
    subtitle: "Live games, creator broadcasts, interviews and experiments.",
    platform: "TWITCH",
    source: "PS5 PRO"
  },

  standby: {
    headline: "SIGNAL STANDBY",
    copy: "The channel is quiet. The network is not."
  },

  projectTitan: {
    visible: true,
    state: "IN DEVELOPMENT",
    title: "PROJECT TITAN",
    note: "Competitive test framework is being built.",
    enabled: false
  },

  schedule: [
    { time:"â€”", title:"Next broadcast", meta:"Not scheduled yet" }
  ],

  scoreFeed: [
    {
      league:"MLB",
      status:"FINAL",
      away:"SAN FRANCISCO",
      awayShort:"SF",
      awayScore:2,
      home:"BOSTON",
      homeShort:"BOS",
      homeScore:3,
      date:"AUG 22"
    }
  ]
};
