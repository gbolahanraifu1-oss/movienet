import { AdSlot } from "../components/AdSlot";
import { useGetTrending } from "@workspace/api-client-react";
import { ContentCard, ContentCardSkeleton } from "../components/ContentCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Plus } from "lucide-react";

export function Home() {
  const { data: trending, isLoading } = useGetTrending({ limit: 10 });

  const heroItem = trending?.featured?.[0] || trending?.movies?.[0];

  return (
    <div className="w-full flex flex-col pb-20">
      {/* Hero Section */}
      <section className="relative w-full h-[70vh] md:h-[85vh] flex items-end">
        {isLoading ? (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        ) : heroItem ? (
          <>
            <div className="absolute inset-0 z-0">
              <img 
                src={heroItem.backdropUrl ?? heroItem.posterUrl ?? undefined} 
                alt={heroItem.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>
            
            <div className="container mx-auto px-4 z-10 pb-16 md:pb-24 max-w-7xl">
              <div className="max-w-3xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-widest bg-primary/20 text-primary rounded border border-primary/30">
                    Trending Now
                  </span>
                  {heroItem.year && <span className="text-zinc-400 font-medium">{heroItem.year}</span>}
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tighter leading-[1.1]">
                  {heroItem.title}
                </h1>
                
                <p className="text-lg md:text-xl text-zinc-300 max-w-2xl line-clamp-3 leading-relaxed">
                  {heroItem.overview}
                </p>
                
                <div className="flex items-center gap-4 mt-4">
                  <Button size="lg" className="rounded-full px-8 text-base font-semibold shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)]" asChild>
                    <Link href={`/title/${heroItem.type}/${heroItem.id}`}>
                      <Play className="w-5 h-5 mr-2 fill-current" /> Details
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <div className="container mx-auto px-4 mt-8 flex flex-col gap-12 max-w-7xl">
        <AdSlot />

        {/* Trending Movies Row */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Trending Movies</h2>
            <Link href="/movies" className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">See all</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {isLoading 
              ? Array(5).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)
              : trending?.movies?.slice(0, 5).map((movie) => (
                  <ContentCard key={movie.id} item={movie} />
                ))}
          </div>
        </section>

        <AdSlot />

        {/* Trending Anime Row */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Hot Anime</h2>
            <Link href="/anime" className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">See all</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {isLoading 
              ? Array(5).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)
              : trending?.anime?.slice(0, 5).map((anime) => (
                  <ContentCard key={anime.id} item={anime} />
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
