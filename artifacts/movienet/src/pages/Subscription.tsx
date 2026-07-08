import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2 } from "lucide-react";
import { Show } from "@clerk/react";

export function Subscription() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center container mx-auto px-4 py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-8 border border-primary/30 shadow-[0_0_50px_-10px_rgba(124,58,237,0.5)]">
        <Crown className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight mb-4 text-center">
        Subscriptions <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Coming Soon</span>
      </h1>
      
      <p className="text-lg md:text-xl text-zinc-400 max-w-2xl text-center mb-12 leading-relaxed">
        We're building something special for true cinema and anime fans. Ad-free viewing, 4K downloads, and exclusive early access.
      </p>

      <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl relative">
        <h3 className="text-2xl font-bold text-white mb-6 font-display">Pro Tier Preview</h3>
        <ul className="space-y-4 mb-8">
          {['Zero Advertisements', '4K & HDR Downloads', 'Early Access to Premieres', 'Custom Profile Badges'].map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-zinc-300">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Show when="signed-out">
          <div className="flex flex-col gap-4 items-center border-t border-white/5 pt-6 mt-6">
            <p className="text-zinc-400 text-center">Sign up now to save your spot and get 1 month free when we launch.</p>
            <Button size="lg" className="w-full font-bold text-lg h-14 bg-white text-black hover:bg-zinc-200" asChild>
              <Link href="/sign-up">Sign Up to Save Spot</Link>
            </Button>
          </div>
        </Show>
        <Show when="signed-in">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center mt-6">
            <p className="text-primary font-medium">You're on the list! We'll email you when Pro launches.</p>
          </div>
        </Show>
      </div>
    </div>
  );
}
