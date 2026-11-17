import { useGetCalendar, useCreateReminder } from "@workspace/api-client-react";
import { AdSlot } from "../components/AdSlot";
import { CountdownTimer } from "../components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Bell, CalendarIcon, Check } from "lucide-react";
import { Link } from "wouter";
import { Show, useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const LOCAL_REMINDERS_KEY = "mn_reminders";

type LocalReminder = {
  contentId: string;
  contentType: string;
  contentTitle: string;
  posterUrl?: string | null;
  releaseDate: string;
  at: number;
};

function loadLocalReminders(): LocalReminder[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalReminder(item: LocalReminder) {
  const prev = loadLocalReminders().filter((x) => x.contentId !== item.contentId);
  localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify([item, ...prev].slice(0, 80)));
}

function hasLocalReminder(contentId: string) {
  return loadLocalReminders().some((x) => x.contentId === contentId);
}

export function Calendar() {
  const { data, isLoading } = useGetCalendar({});
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const createReminder = useCreateReminder();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSaved(new Set(loadLocalReminders().map((r) => r.contentId)));
  }, []);

  const handleRemindMe = (entry: any) => {
    if (!entry?.id || !entry?.title) {
      toast({
        title: "Can't set reminder",
        description: "Missing title data for this release.",
        variant: "destructive",
      });
      return;
    }

    const contentType =
      entry.type === "anime" || entry.type === "series" ? entry.type === "series" ? "anime" : "anime" : "movie";
    const releaseDate =
      entry.releaseDate ||
      entry.release_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      contentId: String(entry.id),
      contentType: contentType === "anime" ? "anime" : "movie",
      contentTitle: entry.title,
      posterUrl: entry.posterUrl || entry.poster_path || null,
      releaseDate: typeof releaseDate === "string" ? releaseDate : new Date(releaseDate).toISOString(),
    };

    // Always persist locally so the button feels instant and works offline / if API is down
    saveLocalReminder({ ...payload, at: Date.now() });
    setSaved((prev) => new Set(prev).add(payload.contentId));

    if (!isSignedIn) {
      toast({
        title: "Reminder saved on this device",
        description: `We'll show ${entry.title} in your Alerts. Sign in to sync across devices.`,
      });
      return;
    }

    createReminder.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({
            title: "Reminder Set!",
            description: `We'll remind you about ${entry.title}.`,
          });
        },
        onError: (err: any) => {
          // Local save already succeeded — don't scare the user
          const msg =
            err?.data?.error ||
            err?.message ||
            "Saved on this device. Cloud sync failed (check sign-in / database).";
          toast({
            title: "Reminder saved locally",
            description: String(msg).slice(0, 160),
          });
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-[80vh]">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 text-center items-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2">
            <CalendarIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white">
            Drop Calendar
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Never miss a release. Track upcoming movies and anime drops in real-time.
          </p>
        </div>

        <AdSlot />

        <div className="flex flex-col gap-4">
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-32 bg-zinc-900 rounded-xl animate-pulse border border-white/5" />
              ))
          ) : data?.length ? (
            data.map((entry) => {
              const isSaved = saved.has(entry.id) || hasLocalReminder(entry.id);
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "relative overflow-hidden flex items-center gap-4 p-4 md:p-6 bg-zinc-900/80 hover:bg-zinc-800 transition-colors border rounded-xl group",
                    entry.isUrgent
                      ? "border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]"
                      : "border-white/5"
                  )}
                >
                  {entry.isUrgent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none" />
                  )}

                  <Link href={`/title/${entry.type}/${entry.id}`} className="shrink-0">
                    <div className="w-16 md:w-24 aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 shadow-md">
                      {entry.posterUrl ? (
                        <img
                          src={entry.posterUrl}
                          alt={entry.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                          No img
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                          entry.isUrgent ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {entry.type}
                      </span>
                      {entry.isUrgent && (
                        <span className="text-xs text-red-500 font-bold animate-pulse">DROPS TOMORROW</span>
                      )}
                    </div>

                    <Link href={`/title/${entry.type}/${entry.id}`}>
                      <h3 className="text-lg md:text-2xl font-bold text-white line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">
                        {entry.title}
                      </h3>
                    </Link>

                    <p className="text-sm text-zinc-500 line-clamp-1 mt-1">{entry.genres?.join(", ")}</p>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <CountdownTimer
                      releaseDate={entry.releaseDate}
                      className="text-base md:text-lg lg:text-xl font-bold"
                    />

                    {/* Visible on ALL screen sizes (was hidden md:flex before) */}
                    <Button
                      size="sm"
                      variant={isSaved ? "secondary" : "outline"}
                      className={
                        isSaved
                          ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                          : "border-white/10 hover:bg-white hover:text-black"
                      }
                      onClick={() => handleRemindMe(entry)}
                      disabled={createReminder.isPending || isSaved}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-4 h-4 mr-2" /> Saved
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" /> Remind Me
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-zinc-500">No upcoming drops found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
