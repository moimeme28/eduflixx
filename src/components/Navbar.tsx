import { Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  Search,
  Compass,
  Sparkles,
  Bookmark,
  Users,
  Menu,
  Home,
  LogOut,
  LogIn,
  UserCircle2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRole();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Edu<span className="text-gradient">Flix</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/subjects"
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            <span className="flex items-center gap-1.5">
              <Compass className="h-4 w-4" /> Subjects
            </span>
          </Link>
          <Link
            to="/assistant"
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Assistant
            </span>
          </Link>
        </nav>

        <form onSubmit={submit} className="ml-auto hidden max-w-md flex-1 items-center sm:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subjects, titles, people…"
              className="w-full rounded-full border border-border bg-card/60 py-2 pl-9 pr-4 text-sm outline-none ring-primary/50 transition-shadow placeholder:text-muted-foreground focus:ring-2"
              aria-label="Search"
            />
          </div>
        </form>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto sm:ml-0 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 flex flex-col gap-0 p-0">
            <SheetHeader className="border-b border-border p-4 text-left">
              <SheetTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-primary" />
                <span className="truncate">
                  {user ? user.email : "Not signed in"}
                </span>
              </SheetTitle>
              {user && role && (
                <p className="text-xs uppercase tracking-wide text-primary">
                  {role === "admin" ? "Admin account" : role === "teacher" ? "Teacher account" : "Student account"}
                </p>
              )}
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto p-2 text-sm">
              <MenuLink to="/" icon={<Home className="h-4 w-4" />} onClick={() => setMenuOpen(false)} exact>
                Home
              </MenuLink>
              <MenuLink to="/subjects" icon={<Compass className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                Browse subjects
              </MenuLink>
              <MenuLink to="/assistant" icon={<Sparkles className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                AI assistant
              </MenuLink>

              {user && (
                <>
                  <div className="mt-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student"}
                  </div>
                  <MenuLink to="/dashboard" icon={<Bookmark className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    My watchlist
                  </MenuLink>
                  <MenuLink to="/classroom" icon={<Users className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    {role === "teacher" ? "Teacher dashboard" : "Student dashboard"}
                  </MenuLink>
                  {role === "admin" && (
                    <MenuLink to="/admin" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Admin panel
                    </MenuLink>
                  )}
                </>
              )}
            </nav>

            <div className="border-t border-border p-3">
              {user ? (
                <Button onClick={signOut} variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              ) : (
                <SheetClose asChild>
                  <Button asChild className="w-full justify-start gap-2">
                    <Link to="/auth">
                      <LogIn className="h-4 w-4" /> Sign in
                    </Link>
                  </Button>
                </SheetClose>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function MenuLink({
  to,
  icon,
  children,
  onClick,
  exact,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeOptions={exact ? { exact: true } : undefined}
      activeProps={{ className: "bg-accent text-foreground" }}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
