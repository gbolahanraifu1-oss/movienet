import { Link } from "wouter";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentItem } from "@workspace/api-client-react";

interface ContentCardProps {
  item: ContentItem;
  priority?: boolean;
}

export function ContentCard({ item, priority = false }: ContentCardProps) {
  const isReleased = item.isReleased !== false;

  return (
    <Link href={`/title/${item.type}/${item.id}`}>
      <div className="group relative flex flex-col gap-3 cursor-pointer">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:border-primary/50 group-hover:shadow-primary/20">
          {item.posterUrl ? (
            <img 
              src={item.posterUrl} 
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-600 font-display">
              No Poster
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {item.rating && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-md px-2 py-1 flex items-center gap-1 border border-white/10">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-white">{item.rating.toFixed(1)}</span>
            </div>
          )}

          {!isReleased && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-primary/80 hover:bg-primary text-white backdrop-blur-md border-transparent text-[10px] uppercase tracking-wider">
                Upcoming
              </Badge>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex justify-between items-end">
             {item.year && <span className="text-sm font-medium text-zinc-300">{item.year}</span>}
             {item.type === 'anime' && <Badge variant="outline" className="text-[10px] border-white/20 text-zinc-300 backdrop-blur-md">Anime</Badge>}
          </div>
        </div>
        
        <div className="flex flex-col gap-1 px-1">
          <h3 className="font-medium text-sm md:text-base text-zinc-100 line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-zinc-500 line-clamp-1">
            {item.genres?.slice(0, 2).join(" • ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[2/3] w-full rounded-xl bg-zinc-800 animate-pulse" />
      <div className="space-y-2 px-1">
        <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
