import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContentCard, ContentCardSkeleton } from "../components/ContentCard";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

type Region = "all" | "kdrama" | "cdrama" | "jdrama" | "western";

const REGIONS: { id: Region; label: string }[] = [
  { id: "all", label: "All Series" },
  { id: "kdrama", label: "K-Drama" },
  { id: "cdrama", label: "C-Drama" },
  { id: "jdrama", label: "J-Drama" },
  { id: "western", label: "Western" },
];

async function fetchSeries(params: {
  region: Region;
  search?: string;
  page: number;
  sort: string;
}) {
  const q = new URLSearchParams();
  q.set("region", params.region);
  q.set("page", String(params.page));
  q.set("sort", params.sort);
  if (params.search) q.set("search", params.search);
  const res = await fetch(`/api/series?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load series");
  return res.json() as Promise<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

export function SeriesPage() {
  const [region, setRegion] = useState<Region>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [region, debounced, sort]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["series", region, debounced, page, sort],
    queryFn: () =>
      fetchSeries({ region, search: debounced || undefined, page, sort }),
  });

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
          Series
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          TV shows, K-Drama, C-Drama and more — not anime or cartoons.
        </p>
      </div>

      <AdSlot label="Advertisement" />

      {/* Region tabs */}
      <div className="flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRegion(r.id)}
            className={
              "px-4 py-1.5 rounded-full text-xs font-medium transition-colors " +
              (region === r.id
                ? "bg-primary text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700")
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series..."
            className="pl-9 bg-zinc-900 border-white/10"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-300"
        >
          <option value="popular">Popular</option>
          <option value="latest">Latest</option>
          <option value="rating">Top rated</option>
          <option value="title">Title</option>
        </select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-red-400 text-sm">Failed to load series.</p>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-zinc-500">No series found.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item: any) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-zinc-400 text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <AdSlot label="Advertisement" />
    </div>
  );
}
