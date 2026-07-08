import { Link, useLocation } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { Search, Popcorn, Flame, Calendar, Trophy, PlaySquare, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Popcorn },
  { href: "/movies", label: "Movies", icon: PlaySquare },
  { href: "/anime", label: "Anime", icon: Flame },
  { href: "/sports", label: "Sports", icon: Trophy },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col relative selection:bg-primary/30 selection:text-primary">
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      
      {/* Navbar */}
      <header 
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent",
          scrolled ? "bg-background/80 backdrop-blur-xl border-border/50 shadow-lg" : "bg-gradient-to-b from-background/90 to-transparent"
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <img src="/logo.svg" alt="MovieNet Logo" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block">Movie<span className="text-primary">Net</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = location === link.href;
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                      active 
                        ? "bg-white/10 text-white" 
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" asChild>
                <Link href="/browse"><Search className="w-5 h-5" /></Link>
              </Button>
            </div>

            <Show when="signed-out">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-lg shadow-primary/20 rounded-full transition-all hover:scale-105 active:scale-95">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </Show>

            <Show when="signed-in">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-primary/20 hover:ring-primary transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-primary/20 text-primary"><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/subscription" className="cursor-pointer">Subscription</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Show>

            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-zinc-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2">
            {NAV_LINKS.map((link) => {
              const active = location === link.href;
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3",
                    active 
                      ? "bg-primary/20 text-primary" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-white/5 py-12 relative z-10">
        <div className="container mx-auto px-4 text-center text-zinc-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale">
            <img src="/logo.svg" alt="MovieNet" className="w-6 h-6" />
            <span className="font-display font-bold text-lg">MovieNet</span>
          </div>
          <p>© {new Date().getFullYear()} MovieNet. This is a gen-z style demo app.</p>
        </div>
      </footer>
    </div>
  );
}
