export function AdSlot({ label }: { label?: string } = {}) {
  return (
    <div className="w-full max-w-5xl mx-auto my-8 px-4">
      <div 
        className="ad-slot min-h-[90px] bg-zinc-900/50 rounded border border-zinc-800 flex items-center justify-center text-zinc-600 text-xs uppercase tracking-widest relative overflow-hidden group"
        data-ad-slot="movienet-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
        <span className="opacity-60">Advertisement</span>
      </div>
    </div>
  );
}
