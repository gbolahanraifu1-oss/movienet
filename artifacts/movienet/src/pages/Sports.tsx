import { useGetSportsEvents, useGetLiveScores, useGetSportsNews } from "@workspace/api-client-react";
import { AdSlot } from "../components/AdSlot";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const LEAGUES = ["All", "NBA", "NFL", "EPL", "MLB", "NHL", "La Liga"];

export function Sports() {
  const { data: liveScores, isLoading: scoresLoading } = useGetLiveScores({});
  const { data: upcoming, isLoading: upcomingLoading } = useGetSportsEvents({});
  const { data: news, isLoading: newsLoading } = useGetSportsNews({ limit: 6 });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white flex items-center gap-4">
            Sports Hub
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 px-3 py-1 text-sm font-semibold tracking-wide animate-pulse">
              <Radio className="w-4 h-4 mr-2" /> LIVE
            </Badge>
          </h1>
          <p className="text-zinc-400 text-lg">Live scores, upcoming events, and breaking news.</p>
        </div>

        <AdSlot />

        <Tabs defaultValue="All" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/5 mb-6 overflow-x-auto justify-start inline-flex w-full md:w-auto hide-scrollbar">
            {LEAGUES.map(league => (
              <TabsTrigger 
                key={league} 
                value={league}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-6 rounded-full"
              >
                {league}
              </TabsTrigger>
            ))}
          </TabsList>

          {LEAGUES.map(league => (
            <TabsContent key={league} value={league} className="space-y-10">
              
              {/* Live Scores Strip */}
              <section className="space-y-4">
                <h2 className="text-2xl font-display font-bold">Live & Recent Scores</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                  {scoresLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="min-w-[280px] h-[100px] bg-zinc-900 rounded-xl animate-pulse border border-white/5 shrink-0" />
                    ))
                  ) : !liveScores?.length ? (
                    <div className="text-zinc-500 py-8 px-4 bg-zinc-900/50 rounded-xl border border-white/5 w-full text-center">
                      No live games right now.
                    </div>
                  ) : liveScores.filter(s => league === "All" || s.league === league).map(score => (
                    <Card key={score.id} className="min-w-[280px] shrink-0 bg-zinc-900 border-white/5 snap-center">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-zinc-400">{score.league}</span>
                          {score.status === 'live' ? (
                            <span className="text-red-500 animate-pulse">{score.minute || 'LIVE'}</span>
                          ) : (
                            <span className="text-zinc-500 uppercase">{score.status}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white truncate max-w-[160px]">{score.homeTeam}</span>
                            <span className="text-xl font-display font-bold">{score.homeScore ?? '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white truncate max-w-[160px]">{score.awayTeam}</span>
                            <span className="text-xl font-display font-bold">{score.awayScore ?? '-'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Layout for Upcoming & News */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Upcoming */}
                <section className="lg:col-span-2 space-y-4">
                  <h2 className="text-2xl font-display font-bold">Upcoming Events</h2>
                  <div className="flex flex-col gap-3">
                    {upcomingLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-[72px] bg-zinc-900 rounded-xl animate-pulse border border-white/5" />
                      ))
                    ) : upcoming?.filter(e => league === "All" || e.league === league).slice(0, 10).map(event => (
                      <div key={event.id} className="bg-zinc-900/80 hover:bg-zinc-800 transition-colors border border-white/5 rounded-xl p-4 flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-16 h-12 bg-zinc-950 rounded border border-white/5 text-center">
                            <span className="text-xs text-zinc-500 uppercase">{format(new Date(event.startTime), 'MMM')}</span>
                            <span className="text-lg font-bold font-display leading-none">{format(new Date(event.startTime), 'd')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-primary font-bold uppercase tracking-wider">{event.league}</span>
                            <span className="font-semibold text-lg text-zinc-100">{event.homeTeam} vs {event.awayTeam}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{format(new Date(event.startTime), 'h:mm a')}</span>
                          {event.venue && <span className="text-xs text-zinc-600 hidden sm:block">{event.venue}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* News */}
                <section className="space-y-4">
                  <h2 className="text-2xl font-display font-bold">Latest News</h2>
                  <div className="flex flex-col gap-4">
                    {newsLoading ? (
                      Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse border border-white/5" />
                      ))
                    ) : news?.filter(n => league === "All" || n.league === league || !n.league).map(item => (
                      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group flex gap-4 bg-zinc-900/50 p-3 rounded-xl border border-white/5 hover:bg-zinc-800 transition-colors">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-20 h-20 object-cover rounded-md shrink-0" />
                        ) : (
                          <div className="w-20 h-20 bg-zinc-800 rounded-md shrink-0 flex items-center justify-center">
                            <Radio className="w-6 h-6 text-zinc-600" />
                          </div>
                        )}
                        <div className="flex flex-col justify-between py-1">
                          <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{item.source}</span>
                            <span>•</span>
                            <span>{format(new Date(item.publishedAt), 'MMM d')}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              </div>

            </TabsContent>
          ))}
        </Tabs>

      </div>
    </div>
  );
}
