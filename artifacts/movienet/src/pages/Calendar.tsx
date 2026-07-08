import { useGetCalendar, useCreateReminder } from "@workspace/api-client-react";
import { AdSlot } from "../components/AdSlot";
import { CountdownTimer } from "../components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Bell, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { Show } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Calendar() {
  const { data, isLoading } = useGetCalendar({});
  const { toast } = useToast();
  const createReminder = useCreateReminder();

  const handleRemindMe = (entry: any) => {
    createReminder.mutate({
      data: {
        contentId: entry.id,
        contentType: entry.type,
        contentTitle: entry.title,
        posterUrl: entry.posterUrl,
        releaseDate: entry.releaseDate
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Reminder Set!",
          description: `We'll remind you about ${entry.title}.`,
        });
      }
    });
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
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-zinc-900 rounded-xl animate-pulse border border-white/5" />
            ))
          ) : data?.length ? (
            data.map((entry) => (
              <div 
                key={entry.id} 
                className={cn(
                  "relative overflow-hidden flex items-center gap-4 p-4 md:p-6 bg-zinc-900/80 hover:bg-zinc-800 transition-colors border rounded-xl group",
                  entry.isUrgent ? "border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]" : "border-white/5"
                )}
              >
                {/* Background glow for urgent items */}
                {entry.isUrgent && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none" />
                )}

                <Link href={`/title/${entry.type}/${entry.id}`} className="shrink-0">
                  <div className="w-16 md:w-24 aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 shadow-md">
                    {entry.posterUrl ? (
                      <img src={entry.posterUrl} alt={entry.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">No img</div>
                    )}
                  </div>
                </Link>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                      entry.isUrgent ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400"
                    )}>
                      {entry.type}
                    </span>
                    {entry.isUrgent && <span className="text-xs text-red-500 font-bold animate-pulse">DROPS TOMORROW</span>}
                  </div>
                  
                  <Link href={`/title/${entry.type}/${entry.id}`}>
                    <h3 className="text-lg md:text-2xl font-bold text-white line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">
                      {entry.title}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-zinc-500 line-clamp-1 mt-1">
                    {entry.genres?.join(", ")}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <CountdownTimer releaseDate={entry.releaseDate} className="text-base md:text-lg lg:text-xl font-bold" />
                  
                  <Show when="signed-in">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/10 hover:bg-white hover:text-black hidden md:flex"
                      onClick={() => handleRemindMe(entry)}
                      disabled={createReminder.isPending}
                    >
                      <Bell className="w-4 h-4 mr-2" /> Remind Me
                    </Button>
                  </Show>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-zinc-500">
              No upcoming drops found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
