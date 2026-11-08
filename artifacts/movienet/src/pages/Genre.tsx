import { useState, useEffect, Fragment } from "react";
import { useParams } from "wouter";
import { useListMovies } from "@workspace/api-client-react";
import { ContentCard } from "../components/ContentCard";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** /genre/:name — e.g. /genre/Action */
export function GenrePage() {
  const params = useParams<{ name?: string }>();
  const genreName = decodeURIComponent(params.name || "").trim();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [genreName]);

  const { data, isLoading, isError } = useListMovies({
    genre: genreName || undefined,
    page,
    sort: "popular",
  });

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
          Genre
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mt-1">
          {genreName || "Movies"}
        </h1>
      </div>

      <AdSlot label="Advertisement" />

      {isLoading && (
        <p className="text-zinc-500 text-sm">Loading {genreName} movies…</p>
      )}
      {isError && (
        <p className="text-red-400 text-sm">Failed to load genre list.</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="text-zinc-500">No movies found in this genre.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((m: any, i: number) => (
          <Fragment key={m.id}>
            <ContentCard item={m} />
            {(i + 1) % 12 === 0 && (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5">
                <AdSlot label="Advertisement" />
              </div>
            )}
          </Fragment>
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
