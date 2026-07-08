import { useSearch, getSearchQueryKey } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { ContentCard, ContentCardSkeleton } from "../components/ContentCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon } from "lucide-react";

export function Browse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<"all" | "movie" | "anime">("all");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(handler);
  }, [query]);

  const searchParams = { q: debouncedQuery, type: type === "all" ? undefined : type };
  const { data, isLoading } = useSearch(
    searchParams,
    { query: { enabled: debouncedQuery.length > 0, queryKey: getSearchQueryKey(searchParams) } }
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl min-h-[80vh]">
      <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
        
        <div className="text-center space-y-4 mt-8">
          <h1 className="text-4xl font-display font-bold">Search</h1>
          <p className="text-zinc-400">Find movies, anime, and more.</p>
        </div>

        <div className="relative w-full shadow-2xl shadow-primary/10">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
          <Input 
            autoFocus
            placeholder="Type to search..." 
            className="w-full h-16 pl-14 text-xl bg-zinc-900 border-zinc-700 text-white rounded-2xl focus-visible:ring-primary focus-visible:border-primary placeholder:text-zinc-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {debouncedQuery.length > 0 && (
          <Tabs value={type} onValueChange={(v) => setType(v as any)} className="w-full">
            <TabsList className="bg-zinc-900/50 border border-white/5 w-full flex justify-start p-1 h-12">
              <TabsTrigger value="all" className="flex-1 text-base">All Results</TabsTrigger>
              <TabsTrigger value="movie" className="flex-1 text-base">Movies</TabsTrigger>
              <TabsTrigger value="anime" className="flex-1 text-base">Anime</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="mt-12">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array(10).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)}
          </div>
        ) : debouncedQuery.length > 0 && data?.items?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {data.items.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : debouncedQuery.length > 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-500">
            <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-xl font-display font-semibold text-zinc-300">No results found</h3>
            <p>We couldn't find anything matching "{debouncedQuery}"</p>
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-600">
            <SearchIcon className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg">Start typing to search MovieNet</p>
          </div>
        )}
      </div>
    </div>
  );
}
