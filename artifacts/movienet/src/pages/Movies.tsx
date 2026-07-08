import { useListMovies, useListGenres } from "@workspace/api-client-react";
import { ContentCard, ContentCardSkeleton } from "../components/ContentCard";
import { AdSlot } from "../components/AdSlot";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function Movies() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<any>("popular");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: genresData } = useListGenres();
  const { data, isLoading } = useListMovies({ 
    search: debouncedSearch || undefined, 
    genre, 
    sort 
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Movies</h1>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                placeholder="Search movies..." 
                className="pl-9 bg-black/50 border-white/10 text-white placeholder:text-zinc-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[140px] bg-black/50 border-white/10 text-white">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="latest">Latest Releases</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="title">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Genre Pills */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={!genre ? "default" : "secondary"}
              className={`cursor-pointer px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${!genre ? 'bg-primary text-white' : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
              onClick={() => setGenre(undefined)}
            >
              All Genres
            </Badge>
            {genresData?.map((g) => (
              <Badge 
                key={g.id}
                variant={genre === g.name ? "default" : "secondary"}
                className={`cursor-pointer px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${genre === g.name ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                onClick={() => setGenre(g.name)}
              >
                {g.name}
              </Badge>
            ))}
          </div>
        </div>

        <AdSlot />

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array(10).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)}
          </div>
        ) : data?.items?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {data.items.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-500">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-xl font-display font-semibold text-zinc-300">No movies found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
