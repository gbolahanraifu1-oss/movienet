import { useGetMovie, useGetAnime, useCreateReminder, getGetMovieQueryKey, getGetAnimeQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Star, Clock, CalendarIcon, Download, Bell, Play, Zap, ListVideo } from "lucide-react";
import { Link } from "wouter";
import { ContentCard } from "../components/ContentCard";
import { AdSlot } from "../components/AdSlot";
import { format } from "date-fns";
import { Show } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

export function TitleDetail({ type, id }: { type: 'movie' | 'anime', id: string }) {
  const { toast } = useToast();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  
  // Conditionally fetch based on type
  const { data: movieData, isLoading: movieLoading } = useGetMovie(id, { query: { enabled: type === 'movie', queryKey: getGetMovieQueryKey(id) } });
  const { data: animeData, isLoading: animeLoading } = useGetAnime(id, { query: { enabled: type === 'anime', queryKey: getGetAnimeQueryKey(id) } });

  const createReminder = useCreateReminder();

  const data = type === 'movie' ? movieData : animeData;
  const isLoading = type === 'movie' ? movieLoading : animeLoading;

  // Anime seasons (extra fields from API; typed loosely until schema regen)
  const seasons: Array<{
    id: string;
    name: string;
    seasonNumber: number;
    episodeCount: number;
    airDate?: string | null;
    posterUrl?: string | null;
  }> = (data as any)?.seasons ?? [];

  const activeSeason = useMemo(() => {
    if (!seasons.length) return null;
    if (selectedSeason != null) {
      return seasons.find((s) => s.seasonNumber === selectedSeason) ?? seasons[0];
    }
    return seasons[0];
  }, [seasons, selectedSeason]);

  if (isLoading) {
    return <div className="min-h-[80vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!data) {
    return <div className="min-h-[80vh] flex items-center justify-center text-zinc-500">Title not found</div>;
  }

  const handleRemindMe = () => {
    createReminder.mutate({
      data: {
        contentId: data.id,
        contentType: data.type,
        contentTitle: data.title,
        posterUrl: data.posterUrl,
        releaseDate: data.releaseDate || new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Reminder Set!",
          description: `We'll notify you when ${data.title} drops.`,
        });
      }
    });
  };

  return (
    <div className="w-full pb-20">
      {/* Cinematic Hero */}
      <div className="relative w-full h-[50vh] md:h-[70vh] bg-black">
        {data.backdropUrl && (
          <img 
            src={data.backdropUrl} 
            alt={data.title} 
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 md:-mt-64 relative z-10 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* Poster Sidebar */}
          <div className="w-48 md:w-72 shrink-0 flex flex-col gap-6">
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900">
              {data.posterUrl ? (
                <img src={data.posterUrl} alt={data.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">No Poster</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {data.isReleased ? (
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg shadow-lg shadow-primary/20">
                  <Play className="w-5 h-5 mr-2 fill-current" /> Watch Now
                </Button>
              ) : (
                <Show when="signed-in" fallback={<Button disabled className="w-full h-12 bg-zinc-800 text-zinc-400">Sign in to set reminder</Button>}>
                  <Button 
                    onClick={handleRemindMe}
                    disabled={createReminder.isPending}
                    className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 text-lg shadow-lg shadow-white/10"
                  >
                    <Bell className="w-5 h-5 mr-2" /> Remind Me
                  </Button>
                </Show>
              )}
            </div>

            {/* Meta facts sidebar */}
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5 space-y-4">
              {data.status && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Status</p>
                  <p className="font-medium text-zinc-200">{data.status}</p>
                </div>
              )}
              {data.releaseDate && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Release Date</p>
                  <p className="font-medium text-zinc-200">{format(new Date(data.releaseDate), 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Info */}
          <div className="flex-1 flex flex-col gap-6 pt-4 md:pt-16">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white leading-tight">
                {data.title}
              </h1>
              {data.tagline && (
                <p className="text-xl md:text-2xl text-zinc-400 font-display italic">"{data.tagline}"</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              {data.rating && (
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  <span>{data.rating.toFixed(1)}</span>
                </div>
              )}
              {data.runtime && (
                <div className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span>{data.runtime} min</span>
                </div>
              )}
              {data.year && (
                <div className="flex items-center gap-1 text-zinc-400">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{data.year}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {data.genres?.map(g => (
                <Badge key={g} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-transparent">
                  {g}
                </Badge>
              ))}
            </div>

            <div className="max-w-3xl mt-4">
              <h3 className="text-lg font-bold font-display text-white mb-2">Overview</h3>
              <p className="text-zinc-400 leading-relaxed text-lg">
                {data.overview || "No overview available."}
              </p>
            </div>

            {/* Trailer */}
            {data.trailerUrl && (
              <div className="mt-8">
                <h3 className="text-lg font-bold font-display text-white mb-4">Trailer</h3>
                <div className="aspect-video w-full max-w-3xl rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                  <iframe 
                    src={data.trailerUrl.replace('watch?v=', 'embed/')} 
                    title="Trailer"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}

            {/* Cast */}
            {data.cast && data.cast.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold font-display text-white mb-4">Top Cast</h3>
                <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
                  {data.cast.map((member, i) => (
                    <div key={i} className="flex-shrink-0 w-24 md:w-32 flex flex-col gap-2">
                      <div className="aspect-[2/3] rounded-lg bg-zinc-800 overflow-hidden border border-white/5">
                        {member.profileUrl ? (
                          <img src={member.profileUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">?</div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-200 line-clamp-1">{member.name}</span>
                        <span className="text-xs text-zinc-500 line-clamp-1">{member.character}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anime / series: season + episode selection */}
            {type === "anime" && seasons.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2">
                  <ListVideo className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold font-display text-white">Seasons & Episodes</h3>
                  {(data as any).numberOfSeasons != null && (
                    <span className="text-xs text-zinc-500">
                      {(data as any).numberOfSeasons} season{(data as any).numberOfSeasons === 1 ? "" : "s"}
                      {(data as any).numberOfEpisodes != null ? ` · ${(data as any).numberOfEpisodes} eps` : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {seasons.map((s) => {
                    const active = (activeSeason?.seasonNumber ?? seasons[0].seasonNumber) === s.seasonNumber;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSeason(s.seasonNumber)}
                        className={
                          active
                            ? "px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground"
                            : "px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/5"
                        }
                      >
                        {s.name}
                        <span className="ml-1.5 text-[10px] opacity-70">{s.episodeCount} ep</span>
                      </button>
                    );
                  })}
                </div>

                {activeSeason && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-3">
                      Select an episode — download links are placeholders for now
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {Array.from({ length: activeSeason.episodeCount }, (_, i) => {
                        const ep = i + 1;
                        const params = new URLSearchParams({
                          title: `${data.title} — S${String(activeSeason.seasonNumber).padStart(2, "0")}E${String(ep).padStart(2, "0")}`,
                          quality: "1080p",
                          size: "~350–450 MB / ep",
                          format: "MKV",
                          url: "",
                          magnet: "",
                          poster: data.posterUrl ?? "",
                          back: `/title/${data.type}/${data.id}`,
                          season: String(activeSeason.seasonNumber),
                          episode: String(ep),
                        });
                        return (
                          <Link
                            key={ep}
                            href={`/download?${params.toString()}`}
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-3 py-2.5 rounded-lg border border-white/5 transition-all group hover:border-primary/30"
                          >
                            <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary shrink-0" />
                            <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                              Episode {ep}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Movies: quality download packs */}
            {type === "movie" && data.isReleased && data.downloadLinks && data.downloadLinks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold font-display text-white mb-1">Downloads</h3>
                <p className="text-xs text-zinc-500 mb-4">Opens in your torrent client (qBittorrent, uTorrent, etc.)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.downloadLinks.map((link: any, i: number) => {
                    const params = new URLSearchParams({
                      title: data.title,
                      quality: link.quality,
                      size: link.size ?? "",
                      format: link.format ?? "",
                      url: link.url ?? "",
                      magnet: link.magnet ?? "",
                      poster: data.posterUrl ?? "",
                      back: `/title/${data.type}/${data.id}`,
                    });
                    return (
                      <Link
                        key={i}
                        href={`/download?${params.toString()}`}
                        className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl border border-white/5 transition-all group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-primary transition-colors">{link.quality}</span>
                            {(link.seeds ?? 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                                {link.seeds} seeds
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">{link.format} • {link.size}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-zinc-600 group-hover:text-primary transition-colors" />
                          <Download className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-20">
          <AdSlot />
        </div>

        {/* Similar Titles */}
        {data.similar && data.similar.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-display font-bold text-white mb-6">You Might Also Like</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {data.similar.map(item => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

