import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function CountdownTimer({ releaseDate, className }: { releaseDate: string, className?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(releaseDate) - +new Date();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        setTimeLeft({ days, hours, minutes, seconds });
        setIsUrgent(difference <= 24 * 60 * 60 * 1000);
      } else {
        setTimeLeft(null);
        setIsUrgent(false);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [releaseDate]);

  if (!timeLeft) {
    return <span className={cn("text-primary font-bold", className)}>Released!</span>;
  }

  return (
    <div className={cn(
      "flex gap-1.5 font-mono text-sm tracking-tighter items-center",
      isUrgent ? "text-destructive animate-pulse" : "text-zinc-400",
      className
    )}>
      {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
      <span>{timeLeft.hours.toString().padStart(2, '0')}h</span>
      <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
      <span>{timeLeft.seconds.toString().padStart(2, '0')}s</span>
    </div>
  );
}
