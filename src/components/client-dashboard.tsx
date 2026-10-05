import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Inbox, UnreadBadge } from "@/components/messages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, Bell, BookmarkCheck, CalendarCheck, ClipboardList, CreditCard, Heart, LayoutDashboard,
  MessageSquare, Search, Settings, Star, BadgeCheck, MapPin,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Logo, SearchPanel } from "@/components/marketplace";
import { ClientRequests } from "@/components/service-requests";
import { ClientReviews } from "@/components/reviews";
import { ClientBookings } from "@/components/bookings";
import { categories } from "@/lib/marketplace-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const clientTabs = [
  "overview", "find-services", "requests", "bookings", "saved", "messages", "reviews", "payments", "notifications", "settings",
] as const;
export type ClientTab = (typeof clientTabs)[number];

const nav: { tab: ClientTab; label: string; icon: ReactNode }[] = [
  { tab: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { tab: "find-services", label: "Find Services", icon: <Search className="size-4" /> },
  { tab: "requests", label: "My Service Requests", icon: <ClipboardList className="size-4" /> },
  { tab: "bookings", label: "My Bookings", icon: <CalendarCheck className="size-4" /> },
  { tab: "saved", label: "Saved Providers", icon: <Heart className="size-4" /> },
  { tab: "messages", label: "Messages", icon: <MessageSquare className="size-4" /> },
  { tab: "reviews", label: "Reviews", icon: <Star className="size-4" /> },
  { tab: "payments", label: "Payments", icon: <CreditCard className="size-4" /> },
  { tab: "notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { tab: "settings", label: "Profile Settings", icon: <Settings className="size-4" /> },
];

/* ---------- data hooks (browser client; RLS limits every query to the signed-in user) ---------- */

function useSaved(userId: string) {
  return useQuery({
    queryKey: ["client", userId, "saved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_providers")
        .select("id, created_at, provider:provider_profiles(id, public_name, business_name, profession, city, area, rating_average, review_count, is_verified, starting_price)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useNotifications(userId: string) {
  return useQuery({
    queryKey: ["client", userId, "notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function useRequests(userId: string) {
  return useQuery({
    queryKey: ["client", userId, "requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests").select("id, title, status, created_at, preferred_date")
        .eq("client_id", userId).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
}

/* ---------- shell ---------- */

export function ClientDashboard({ tab, conversation }: { tab: ClientTab; conversation?: string | undefined }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const current = nav.find((n) => n.tab === tab) ?? nav[0]!;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-sand-deep bg-primary-foreground">
        <div className="page-shell flex min-h-[72px] items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="text-brand" aria-label="Notifications">
              <Link to="/dashboard" search={{ tab: "notifications" }}><Bell /></Link>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
              <span className="hidden sm:inline">Sign out</span><ArrowRight className="rotate-180" />
            </Button>
          </div>
        </div>
      </header>
      <main className="page-shell grid gap-8 py-8 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-3xl bg-primary-foreground p-4 ring-1 ring-sand-deep lg:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber">Client portal</p>
          <p className="mt-2 truncate font-display text-lg font-semibold text-brand">{user.email}</p>
          <nav aria-label="Dashboard" className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <Link
                key={item.tab}
                to="/dashboard"
                search={{ tab: item.tab }}
                aria-current={item.tab === tab ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${item.tab === tab ? "bg-sand text-brand" : "text-muted-warm hover:bg-cream hover:text-brand"}`}
              >
                {item.icon}{item.label}{item.tab === "messages" && <UnreadBadge />}
              </Link>
            ))}
          </nav>
        </aside>
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-terracotta-deep">Client dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-brand sm:text-4xl">{current.label}</h1>
          <div className="mt-6">
            {tab === "overview" && <Overview userId={user.id} />}
            {tab === "find-services" && <FindServices />}
            {tab === "saved" && <SavedProviders userId={user.id} />}
            {tab === "notifications" && <Notifications userId={user.id} />}
            {tab === "settings" && <ProfileSettings userId={user.id} email={user.email ?? ""} />}
            {tab === "requests" && <Card><ClientRequests userId={user.id} /></Card>}
            {tab === "bookings" && <Card><ClientBookings userId={user.id} /></Card>}
            {tab === "messages" && <Inbox userId={user.id} selected={conversation} onSelect={(id) => void navigate({ to: "/dashboard", search: { tab: "messages", c: id } })} />}
            {tab === "reviews" && <Card><ClientReviews userId={user.id} /></Card>}
            {tab === "payments" && <Placeholder title="Payments are not available yet" text="Secure payments will be added in a later phase. Please agree payment directly with your provider for now." />}
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6 ${className}`}>{children}</div>;
}

function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">{text}{action && <div className="mt-4">{action}</div>}</div>;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <Card className="text-center">
      <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-terracotta-deep">Future phase</span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-brand">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-warm">{text}</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/dashboard" search={{ tab: "find-services" }}>Find services</Link></Button>
    </Card>
  );
}

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

/* ---------- overview ---------- */

function Overview({ userId }: { userId: string }) {
  const saved = useSaved(userId);
  const notes = useNotifications(userId);
  const requests = useRequests(userId);
  const unread = notes.data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saved providers" value={saved.data?.length} icon={<Heart />} />
        <StatCard label="Service requests" value={requests.data?.length} icon={<ClipboardList />} />
        <StatCard label="Unread notifications" value={notes.data ? unread : undefined} icon={<Bell />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHead title="Recent activity" tab="requests" />
          {requests.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : requests.data?.length ? (
            <ul className="divide-y divide-sand-deep">
              {requests.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-semibold text-brand">{r.title}</span>
                  <span className="rounded-full bg-sand px-2.5 py-1 text-xs capitalize text-terracotta-deep">{r.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          ) : <Empty text="No service activity yet. Find a professional to get started." action={<Button asChild size="sm" className="rounded-full"><Link to="/dashboard" search={{ tab: "find-services" }}>Find services</Link></Button>} />}
        </Card>
        <Card>
          <SectionHead title="Notifications" tab="notifications" />
          {notes.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : notes.data?.length ? (
            <ul className="divide-y divide-sand-deep">
              {notes.data.slice(0, 4).map((n) => (
                <li key={n.id} className="py-3 text-sm">
                  <p className={`font-semibold ${n.read_at ? "text-muted-warm" : "text-brand"}`}>{n.title}</p>
                  <p className="text-xs text-muted-warm">{formatDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <Empty text="You're all caught up. Updates about your requests will show here." />}
        </Card>
      </div>
      <Card>
        <SectionHead title="Saved providers" tab="saved" />
        <SavedList userId={userId} limit={3} />
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | undefined; icon: ReactNode }) {
  return (
    <Card className="flex items-center justify-between">
      <div><p className="text-sm text-muted-warm">{label}</p><p className="mt-1 font-display text-3xl font-semibold text-brand">{value ?? "–"}</p></div>
      <span className="grid size-11 place-items-center rounded-2xl bg-sand text-terracotta-deep [&_svg]:size-5">{icon}</span>
    </Card>
  );
}

function SectionHead({ title, tab }: { title: string; tab: ClientTab }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-xl font-semibold text-brand">{title}</h2>
      <Link to="/dashboard" search={{ tab }} className="text-sm font-semibold text-terracotta-deep hover:underline">View all</Link>
    </div>
  );
}

/* ---------- find services ---------- */

function FindServices() {
  return (
    <div className="grid gap-6">
      <SearchPanel compact idPrefix="dash" />
      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-brand">Browse by category</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.slug} to="/service-categories/$slug" params={{ slug: c.slug }} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-brand ring-1 ring-sand-deep hover:ring-terracotta">
              {c.name}<ArrowRight className="size-4 text-terracotta-deep" />
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-5 rounded-full"><Link to="/directory">Open full provider directory</Link></Button>
      </Card>
    </div>
  );
}

/* ---------- saved providers ---------- */

function SavedProviders({ userId }: { userId: string }) {
  return <Card><SavedList userId={userId} /></Card>;
}

function SavedList({ userId, limit }: { userId: string; limit?: number }) {
  const qc = useQueryClient();
  const saved = useSaved(userId);
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_providers").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Provider removed from saved list"); void qc.invalidateQueries({ queryKey: ["client", userId, "saved"] }); },
    onError: () => toast.error("Couldn't remove provider. Please try again."),
  });

  if (saved.isLoading) return <p className="text-sm text-muted-warm">Loading…</p>;
  if (saved.error) return <Empty text="We couldn't load your saved providers." />;
  const rows = (saved.data ?? []).slice(0, limit);
  if (!rows.length) return <Empty text="You haven't saved any providers yet. Tap the heart on a provider's profile to keep them here." action={<Button asChild size="sm" className="rounded-full"><Link to="/directory">Browse providers</Link></Button>} />;

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const p = row.provider;
        if (!p) return null;
        const name = p.public_name || p.business_name || "Service provider";
        return (
          <li key={row.id} className="rounded-2xl bg-cream p-4 ring-1 ring-sand-deep">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate font-semibold text-brand">{name}{p.is_verified && <BadgeCheck className="size-4 shrink-0 text-accent-green" aria-label="Verified" />}</p>
                <p className="text-sm text-muted-warm">{p.profession ?? "Professional"}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Remove ${name}`} disabled={remove.isPending} onClick={() => remove.mutate(row.id)}>
                <BookmarkCheck className="text-terracotta-deep" />
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-warm"><MapPin className="size-3.5" />{[p.area, p.city].filter(Boolean).join(", ") || "Abuja"}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-warm"><Star className="size-3.5 fill-amber text-amber" />{Number(p.rating_average).toFixed(1)} ({p.review_count} reviews)</p>
            <Button asChild size="sm" variant="outline" className="mt-4 w-full rounded-full"><Link to="/providers/$id" params={{ id: p.id }}>View profile</Link></Button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- notifications ---------- */

export function Notifications({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const notes = useNotifications(userId);
  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["client", userId, "notifications"] }),
  });
  return (
    <Card>
      <div className="mb-4 flex justify-end"><Button size="sm" variant="outline" className="rounded-full" disabled={!notes.data?.some((n) => !n.read_at) || markAll.isPending} onClick={() => markAll.mutate()}>Mark all as read</Button></div>
      {notes.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : notes.data?.length ? (
        <ul className="divide-y divide-sand-deep">
          {notes.data.map((n) => (
            <li key={n.id} className="py-3">
              <p className={`text-sm font-semibold ${n.read_at ? "text-muted-warm" : "text-brand"}`}>{n.title}</p>
              {n.body && <p className="text-sm text-muted-warm">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-warm">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : <Empty text="No notifications yet." />}
    </Card>
  );
}

/* ---------- profile settings ---------- */

function ProfileSettings({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["client", userId, "profile"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, bio").eq("user_id", userId).maybeSingle(),
        supabase.from("client_profiles").select("address, city, state, preferred_location, additional_info").eq("user_id", userId).maybeSingle(),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      return { profile: p.data, client: c.data };
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "", address: "", city: "", state: "FCT", preferred_location: "", additional_info: "" });
  useEffect(() => {
    if (!query.data) return;
    const { profile, client } = query.data;
    setForm({
      full_name: profile?.full_name ?? "", phone: profile?.phone ?? "", bio: profile?.bio ?? "",
      address: client?.address ?? "", city: client?.city ?? "", state: client?.state ?? "FCT",
      preferred_location: client?.preferred_location ?? "", additional_info: client?.additional_info ?? "",
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const clean = (v: string) => v.trim().slice(0, 500) || null;
      const p = await supabase.from("profiles").update({ full_name: clean(form.full_name), phone: clean(form.phone), bio: clean(form.bio) }).eq("user_id", userId);
      if (p.error) throw p.error;
      const c = await supabase.from("client_profiles").upsert({
        user_id: userId, address: clean(form.address), city: clean(form.city), state: clean(form.state),
        preferred_location: clean(form.preferred_location), additional_info: clean(form.additional_info),
      }, { onConflict: "user_id" });
      if (c.error) throw c.error;
    },
    onSuccess: () => { toast.success("Profile saved"); void qc.invalidateQueries({ queryKey: ["client", userId, "profile"] }); },
    onError: () => toast.error("Couldn't save your profile. Please try again."),
  });

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <Input id={`pf-${key}`} type={type} maxLength={200} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  if (query.isLoading) return <Card><p className="text-sm text-muted-warm">Loading…</p></Card>;

  return (
    <Card>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); if (!form.full_name.trim()) { toast.error("Please enter your full name"); return; } save.mutate(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("full_name", "Full name")}
          <div className="grid gap-1.5"><Label htmlFor="pf-email">Email</Label><Input id="pf-email" value={email} disabled /></div>
          {field("phone", "Phone number", "tel")}
          {field("address", "Address")}
          {field("city", "City / Area")}
          {field("state", "State")}
          {field("preferred_location", "Preferred service location")}
        </div>
        <div className="grid gap-1.5"><Label htmlFor="pf-bio">About you</Label><Textarea id="pf-bio" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label htmlFor="pf-info">Additional information for providers</Label><Textarea id="pf-info" maxLength={500} value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} /></div>
        <Button type="submit" className="w-fit rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
      </form>
    </Card>
  );
}
