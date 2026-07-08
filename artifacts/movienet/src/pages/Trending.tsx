import { useGetTrending } from "@workspace/api-client-react";
import { ContentCard, ContentCardSkeleton } from "../components/ContentCard";
import { AdSlot } from "../components/AdSlot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame } from "lucide-react";

export function Trending() {
  const { data, isLoading } = useGetTrending({ limit: 20 });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col gap-4 text-center items-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-2">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white">
            Trending Now
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            The most watched, most hyped, and highest rated content across MovieNet this week.
          </p>
        </div>

        <AdSlot />

        <Tabs defaultValue="movies" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-zinc-900 border border-white/10 p-1">
              <TabsTrigger value="movies" className="px-8 rounded-md font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Movies
              </TabsTrigger>
              <TabsTrigger value="anime" className="px-8 rounded-md font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Anime
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="movies" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {Array(15).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {data?.movies?.map((movie) => (
                  <ContentCard key={movie.id} item={movie} priority={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="anime" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {Array(15).fill(0).map((_, i) => <ContentCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {data?.anime?.map((anime) => (
                  <ContentCard key={anime.id} item={anime} priority={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
