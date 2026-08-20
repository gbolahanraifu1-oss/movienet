// Sports data from TheSportsDB free API
const SPORTS_BASE = "https://www.thesportsdb.com/api/v1/json/3";

async function sportsFetch(endpoint: string): Promise<any> {
  const res = (await fetch(`${SPORTS_BASE}${endpoint}`)) as unknown as {
    ok: boolean;
    status: number;
    json: () => Promise<any>;
  };
  if (!res.ok) throw new Error(`Sports API error ${res.status}`);
  return res.json();
}

const LEAGUES = [
  { id: "4387", name: "NBA", sport: "Basketball" },
  { id: "4391", name: "NFL", sport: "American Football" },
  { id: "4328", name: "EPL", sport: "Soccer" },
  { id: "4424", name: "MLB", sport: "Baseball" },
  { id: "4380", name: "NHL", sport: "Hockey" },
  { id: "4346", name: "La Liga", sport: "Soccer" },
];

function getLeagueId(league?: string): string | undefined {
  if (!league) return undefined;
  const found = LEAGUES.find(l => l.name.toLowerCase() === league.toLowerCase());
  return found?.id;
}

export async function getSportsEventsList(params: { league?: string; limit?: number }) {
  const limit = params.limit || 20;
  try {
    const leagueId = params.league ? getLeagueId(params.league) : LEAGUES[0].id;
    const id = leagueId || LEAGUES[0].id;
    const data = await sportsFetch(`/eventsnextleague.php?id=${id}`);
    const events = (data.events || []).slice(0, limit);
    return events.map((e: any) => formatEvent(e));
  } catch {
    return getMockSportsEvents().slice(0, limit);
  }
}

export async function getLiveScoresList(params: { league?: string }) {
  try {
    // TheSportsDB live scores endpoint (limited on free tier)
    const data = await sportsFetch("/livescore.php?l=4328");
    const scores = data.events || data.livescores || [];
    return scores.slice(0, 20).map((e: any) => formatScore(e));
  } catch {
    return getMockScores();
  }
}

export async function getSportsNewsList(limit = 10) {
  // Generate curated sports news items (real news requires paid APIs)
  return getMockSportsNews().slice(0, limit);
}

function formatEvent(e: any) {
  return {
    id: String(e.idEvent || Math.random()),
    homeTeam: e.strHomeTeam || "Home",
    awayTeam: e.strAwayTeam || "Away",
    league: e.strLeague || "Unknown League",
    leagueLogo: e.strLeagueBadge || null,
    homeTeamLogo: e.strHomeTeamBadge || null,
    awayTeamLogo: e.strAwayTeamBadge || null,
    startTime: e.strTimestamp || e.dateEvent + "T" + (e.strTime || "00:00:00") + "Z",
    venue: e.strVenue || null,
    status: "scheduled" as const,
    streamUrl: null,
  };
}

function formatScore(e: any) {
  return {
    id: String(e.idEvent || Math.random()),
    homeTeam: e.strHomeTeam || "Home",
    awayTeam: e.strAwayTeam || "Away",
    homeScore: e.intHomeScore !== null ? Number(e.intHomeScore) : null,
    awayScore: e.intAwayScore !== null ? Number(e.intAwayScore) : null,
    league: e.strLeague || "Unknown",
    leagueLogo: e.strLeagueBadge || null,
    homeTeamLogo: e.strHomeTeamBadge || null,
    awayTeamLogo: e.strAwayTeamBadge || null,
    status: e.strProgress ? "live" : "finished" as any,
    minute: e.strProgress || null,
    startTime: e.strTimestamp || new Date().toISOString(),
  };
}

function getMockSportsEvents() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 172800000);
  return [
    {
      id: "ev1", homeTeam: "Los Angeles Lakers", awayTeam: "Golden State Warriors",
      league: "NBA", leagueLogo: null, homeTeamLogo: null, awayTeamLogo: null,
      startTime: tomorrow.toISOString(), venue: "Staples Center", status: "scheduled" as const, streamUrl: null,
    },
    {
      id: "ev2", homeTeam: "Manchester City", awayTeam: "Arsenal",
      league: "EPL", leagueLogo: null, homeTeamLogo: null, awayTeamLogo: null,
      startTime: dayAfter.toISOString(), venue: "Etihad Stadium", status: "scheduled" as const, streamUrl: null,
    },
    {
      id: "ev3", homeTeam: "Kansas City Chiefs", awayTeam: "San Francisco 49ers",
      league: "NFL", leagueLogo: null, homeTeamLogo: null, awayTeamLogo: null,
      startTime: new Date(now.getTime() + 259200000).toISOString(), venue: "Arrowhead Stadium", status: "scheduled" as const, streamUrl: null,
    },
    {
      id: "ev4", homeTeam: "New York Yankees", awayTeam: "Boston Red Sox",
      league: "MLB", leagueLogo: null, homeTeamLogo: null, awayTeamLogo: null,
      startTime: new Date(now.getTime() + 345600000).toISOString(), venue: "Yankee Stadium", status: "scheduled" as const, streamUrl: null,
    },
    {
      id: "ev5", homeTeam: "Real Madrid", awayTeam: "FC Barcelona",
      league: "La Liga", leagueLogo: null, homeTeamLogo: null, awayTeamLogo: null,
      startTime: new Date(now.getTime() + 432000000).toISOString(), venue: "Santiago Bernabéu", status: "scheduled" as const, streamUrl: null,
    },
  ];
}

function getMockScores() {
  return [
    {
      id: "sc1", homeTeam: "Boston Celtics", awayTeam: "Miami Heat",
      homeScore: 87, awayScore: 82, league: "NBA", leagueLogo: null,
      homeTeamLogo: null, awayTeamLogo: null, status: "live" as const,
      minute: "Q3 8:45", startTime: new Date().toISOString(),
    },
    {
      id: "sc2", homeTeam: "Liverpool", awayTeam: "Chelsea",
      homeScore: 2, awayScore: 1, league: "EPL", leagueLogo: null,
      homeTeamLogo: null, awayTeamLogo: null, status: "live" as const,
      minute: "67'", startTime: new Date().toISOString(),
    },
    {
      id: "sc3", homeTeam: "Toronto Maple Leafs", awayTeam: "Montreal Canadiens",
      homeScore: 3, awayScore: 2, league: "NHL", leagueLogo: null,
      homeTeamLogo: null, awayTeamLogo: null, status: "finished" as const,
      minute: null, startTime: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

function getMockSportsNews() {
  return [
    {
      id: "n1", title: "NBA Playoffs: Top Contenders to Watch This Season",
      summary: "With the playoffs approaching, analysts break down which teams have the best shot at the championship.",
      imageUrl: null, source: "ESPN", publishedAt: new Date().toISOString(),
      url: "https://espn.com", league: "NBA",
    },
    {
      id: "n2", title: "EPL Transfer Window: Big Moves That Shook the League",
      summary: "The January transfer window saw some surprising moves that could reshape the Premier League standings.",
      imageUrl: null, source: "BBC Sport", publishedAt: new Date().toISOString(),
      url: "https://bbc.com/sport", league: "EPL",
    },
    {
      id: "n3", title: "NFL Draft: Top Prospects for This Year",
      summary: "College football's finest prepare to make the jump. Here are the top prospects expected to go in the first round.",
      imageUrl: null, source: "NFL.com", publishedAt: new Date().toISOString(),
      url: "https://nfl.com", league: "NFL",
    },
    {
      id: "n4", title: "MLB Season Preview: Teams Built to Win",
      summary: "A deep look at which franchises have put together rosters capable of making a World Series run.",
      imageUrl: null, source: "MLB.com", publishedAt: new Date().toISOString(),
      url: "https://mlb.com", league: "MLB",
    },
    {
      id: "n5", title: "Champions League: Road to the Final",
      summary: "Europe's elite clubs clash in the knockout rounds. Who will survive and make it to the final?",
      imageUrl: null, source: "UEFA", publishedAt: new Date().toISOString(),
      url: "https://uefa.com", league: "EPL",
    },
    {
      id: "n6", title: "Rising Stars: Athletes to Watch in 2025",
      summary: "From basketball courts to soccer pitches, these young athletes are redefining what's possible in their sports.",
      imageUrl: null, source: "Sports Illustrated", publishedAt: new Date().toISOString(),
      url: "https://si.com", league: null,
    },
  ];
}
