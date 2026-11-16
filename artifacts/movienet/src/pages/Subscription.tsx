import { Link } from "wouter";
import { Crown, ArrowLeft } from "lucide-react";

export function Subscription() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8 max-w-lg mx-auto pb-28">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Crown className="w-6 h-6 text-amber-400" /> Subscription
      </h1>
      <p className="text-zinc-400 text-sm mt-2 mb-6">
        Free plan includes streaming with an account and limited guest downloads. Premium options coming soon.
      </p>
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
        <p className="font-semibold">Free</p>
        <ul className="text-sm text-zinc-400 list-disc pl-5 space-y-1">
          <li>Full streaming when signed in</li>
          <li>5 guest downloads before sign-in</li>
          <li>Watchlist and continue watching</li>
        </ul>
      </div>
    </div>
  );
}
