import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Inbox, UnreadBadge } from "@/components/messages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, Bell, Briefcase, CalendarCheck, CalendarClock, ClipboardList, CreditCard, Image as ImageIcon,
  LayoutDashboard, MessageSquare, Pencil, Plus, Settings, ShieldCheck, Star, Trash2, UserRound, Wallet,
} from "lucide-react";

import { Notifications } from "@/components/client-dashboard";
import { ProviderSubscription } from "@/components/subscriptions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth-provider";
import { ProviderRequests } from "@/components/service-requests";
import { ProviderReviews } from "@/components/reviews";
import { ProviderVerification } from "@/components/verification";
import { ProviderBookings, WeeklySchedule } from "@/components/bookings";
import { Logo } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const providerTabs = [
  "overview", "profile", "services", "portfolio", "availability", "requests", "bookings", "messages",
  "earnings", "reviews", "subscription", "verification", "notifications", "settings",
] as const;
export type ProviderTab = (typeof providerTabs)[number];

type PriceType = Database["public"]["Enums"]["price_type"];
type Availability = Database["public"]["Enums"]["availability_status"];
const priceTypes: { value: PriceType; label: string }[] = [
  { value: "starting_from", label: "Starting from" }, { value: "fixed", label: "Fixed" },
  { value: "hourly", label: "Per hour" }, { value: "daily", label: "Per day" }, { value: "negotiable", label: "Negotiable" },
];

const nav: { tab: ProviderTab; label: string; icon: ReactNode }[] = [
  { tab: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { tab: "profile", label: "My Professional Profile", icon: <UserRound className="size-4" /> },
  { tab: "services", label: "My Services", icon: <Briefcase className="size-4" /> },
  { tab: "portfolio", label: "Portfolio", icon: <ImageIcon className="size-4" /> },
  { tab: "availability", label: "Availability", icon: <CalendarClock className="size-4" /> },
  { tab: "requests", label: "Service Requests", icon: <ClipboardList className="size-4" /> },
  { tab: "bookings", label: "Bookings", icon: <CalendarCheck className="size-4" /> },
  { tab: "messages", label: "Messages", icon: <MessageSquare className="size-4" /> },
  { tab: "earnings", label: "Earnings", icon: <Wallet className="size-4" /> },
  { tab: "reviews", label: "Reviews", icon: <Star className="size-4" /> },
  { tab: "subscription", label: "Subscription", icon: <CreditCard className="size-4" /> },
  { tab: "verification", label: "Verification", icon: <ShieldCheck className="size-4" /> },
  { tab: "notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { tab: "settings", label: "Profile Settings", icon: <Settings className="size-4" /> },
];

const card = "rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6";
const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const naira = (n: number | null | undefined) => (n == null ? "—" : `₦${Number(n).toLocaleString("en-NG")}`);

/* ---------- data (RLS restricts every read/write to the signed-in provider) ---------- */

function useProvider(userId: string) {
  return useQuery({
    queryKey: ["provider", userId, "profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const created = await supabase.from("provider_profiles").insert({ user_id: userId }).select("*").single();
      if (created.error) throw created.error;
      return created.data;
    },
  });
}

function useServices(providerId?: string) {
  return useQuery({
    enabled: !!providerId,
    queryKey: ["provider", providerId, "services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_services")
        .select("*, category:service_categories(name), subcategory:service_subcategories(name)")
        .eq("provider_id", providerId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function usePortfolio(providerId?: string) {
  return useQuery({
    enabled: !!providerId,
    queryKey: ["provider", providerId, "portfolio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_items").select("*")
        .eq("provider_id", providerId!).order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      const paths = data.map((d) => d.image_path).filter((p): p is string => !!p);
      const urls: Record<string, string> = {};
      if (paths.length) {
        const signed = await supabase.storage.from("portfolio").createSignedUrls(paths, 3600);
        signed.data?.forEach((s) => { if (s.path && s.signedUrl) urls[s.path] = s.signedUrl; });
      }
      return data.map((d) => ({ ...d, url: d.image_path ? urls[d.image_path] : undefined }));
    },
  });
}

function useCategories() {
  return useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: async () => {
      const [c, s] = await Promise.all([
        supabase.from("service_categories").select("id, name").eq("is_active", true).order("sort_order"),
        supabase.from("service_subcategories").select("id, name, category_id").eq("is_active", true).order("sort_order"),
      ]);
      if (c.error) throw c.error;
      if (s.error) throw s.error;
      return { categories: c.data, subcategories: s.data };
    },
  });
}

/* ---------- shell ---------- */

export function ProviderDashboard({ tab, conversation }: { tab: ProviderTab; conversation?: string | undefined }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const provider = useProvider(user?.id ?? "");
  if (!user) return null;
  const current = nav.find((n) => n.tab === tab) ?? nav[0]!;
  const p = provider.data;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-sand-deep bg-primary-foreground">
        <div className="page-shell flex min-h-[72px] items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="text-brand" aria-label="Notifications">
              <Link to="/provider-dashboard" search={{ tab: "notifications" }}><Bell /></Link>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
              <span className="hidden sm:inline">Sign out</span><ArrowRight className="rotate-180" />
            </Button>
          </div>
        </div>
      </header>
      <main className="page-shell grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl bg-primary-foreground p-4 ring-1 ring-sand-deep lg:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber">Provider portal</p>
          <p className="mt-2 truncate font-display text-lg font-semibold text-brand">{p?.business_name || p?.public_name || user.email}</p>
          <nav aria-label="Dashboard" className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <Link key={item.tab} to="/provider-dashboard" search={{ tab: item.tab }}
                aria-current={item.tab === tab ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${item.tab === tab ? "bg-sand text-brand" : "text-muted-warm hover:bg-cream hover:text-brand"}`}>
                {item.icon}{item.label}{item.tab === "messages" && <UnreadBadge />}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-terracotta-deep">Provider dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-brand sm:text-4xl">{current.label}</h1>
          <div className="mt-6">
            {provider.isLoading && <p className="text-muted-warm">Loading your workspace…</p>}
            {provider.error && <p className="text-destructive">Couldn't load your provider profile. Please refresh.</p>}
            {p && <>
              {tab === "overview" && <Overview provider={p} />}
              {tab === "profile" && <ProfessionalProfile provider={p} />}
              {tab === "services" && <Services providerId={p.id} />}
              {tab === "portfolio" && <Portfolio providerId={p.id} userId={user.id} />}
              {tab === "availability" && <><AvailabilityPanel provider={p} /><div className="mt-6"><WeeklySchedule providerId={p.id} /></div></>}
              {tab === "settings" && <AccountSettings userId={user.id} email={user.email ?? ""} />}
              {tab === "verification" && <ProviderVerification provider={p} />}
              {tab === "requests" && <ProviderRequests providerId={p.id} />}
              {tab === "bookings" && <ProviderBookings providerId={p.id} />}
              {tab === "messages" && <Inbox userId={user.id} selected={conversation} onSelect={(id) => void navigate({ to: "/provider-dashboard", search: { tab: "messages", c: id } })} />}
              {tab === "earnings" && <Placeholder title="Earnings are coming soon" text="Payouts and income summaries will be added with payments." />}
              {tab === "reviews" && <ProviderReviews providerId={p.id} />}
              {tab === "subscription" && <ProviderSubscription providerId={p.id} />}
              {tab === "notifications" && <Notifications userId={user.id} />}
            </>}
          </div>
        </section>
      </main>
    </div>
  );
}

type ProviderRow = Database["public"]["Tables"]["provider_profiles"]["Row"];

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${card} text-center`}>
      <span className="inline-block rounded-full bg-sand px-3 py-1 text-xs font-bold uppercase tracking-wider text-terracotta-deep">Future phase</span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-brand">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-warm">{text}</p>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between text-muted-warm"><span className="text-sm font-semibold">{label}</span>{icon}</div>
      <p className="mt-3 font-display text-3xl font-semibold text-brand">{value}</p>
    </div>
  );
}

/* ---------- overview ---------- */

function Overview({ provider }: { provider: ProviderRow }) {
  const services = useServices(provider.id);
  const portfolio = usePortfolio(provider.id);
  const checklist = [
    { done: !!(provider.business_name || provider.public_name), label: "Add your name or business name", tab: "profile" as const },
    { done: !!provider.bio, label: "Write a short biography", tab: "profile" as const },
    { done: !!provider.city, label: "Set your location", tab: "profile" as const },
    { done: (services.data?.length ?? 0) > 0, label: "Add at least one service", tab: "services" as const },
    { done: (portfolio.data?.length ?? 0) > 0, label: "Upload a portfolio item", tab: "portfolio" as const },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Services" value={services.data?.length ?? "–"} icon={<Briefcase className="size-5" />} />
        <Stat label="Portfolio items" value={portfolio.data?.length ?? "–"} icon={<ImageIcon className="size-5" />} />
        <Stat label="Rating" value={provider.review_count ? `${Number(provider.rating_average).toFixed(1)} (${provider.review_count})` : "New"} icon={<Star className="size-5" />} />
        <Stat label="Availability" value={<span className="capitalize">{provider.availability_status}</span>} icon={<CalendarClock className="size-5" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <h2 className="font-display text-xl font-semibold text-brand">Profile completion · {doneCount}/{checklist.length}</h2>
          <div className="mt-3 h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-terracotta" style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={c.done ? "text-muted-warm line-through" : "text-ink"}>{c.label}</span>
                {!c.done && <Link to="/provider-dashboard" search={{ tab: c.tab }} className="font-semibold text-terracotta-deep">Do it</Link>}
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="font-display text-xl font-semibold text-brand">Listing status</h2>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <BadgeCheck className={provider.is_verified ? "size-5 text-terracotta" : "size-5 text-muted-warm"} />
            Verification: <span className="font-semibold capitalize">{provider.verification_status}</span>
          </p>
          <p className="mt-2 text-sm">Public listing: <span className="font-semibold">{provider.is_published ? "Visible to clients" : "Hidden"}</span></p>
          <p className="mt-4 text-sm text-muted-warm">Publish your profile from “My Professional Profile” once it's complete so clients can find you.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- professional profile ---------- */

function ProfessionalProfile({ provider }: { provider: ProviderRow }) {
  const qc = useQueryClient();
  const cats = useCategories();
  const [f, setF] = useState({
    public_name: provider.public_name ?? "", business_name: provider.business_name ?? "", profession: provider.profession ?? "",
    headline: provider.headline ?? "", bio: provider.bio ?? "", category_id: provider.category_id ?? "",
    years_experience: provider.years_experience?.toString() ?? "", starting_price: provider.starting_price?.toString() ?? "",
    state: provider.state ?? "FCT", city: provider.city ?? "", area: provider.area ?? "", is_published: provider.is_published,
  });
  const [avatarUrl, setAvatarUrl] = useState<string>();
  useEffect(() => {
    if (!provider.avatar_url) return;
    void supabase.storage.from("avatars").createSignedUrl(provider.avatar_url, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl));
  }, [provider.avatar_url]);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.public_name.trim()) throw new Error("Please enter your display name.");
      const years = f.years_experience ? Number(f.years_experience) : null;
      const price = f.starting_price ? Number(f.starting_price) : null;
      if (years != null && (!Number.isInteger(years) || years < 0 || years > 70)) throw new Error("Years of experience must be 0–70.");
      if (price != null && (isNaN(price) || price < 0)) throw new Error("Starting price must be a positive number.");
      const { error } = await supabase.from("provider_profiles").update({
        public_name: f.public_name.trim().slice(0, 100), business_name: f.business_name.trim().slice(0, 120) || null,
        profession: f.profession.trim().slice(0, 100) || null, headline: f.headline.trim().slice(0, 160) || null,
        bio: f.bio.trim().slice(0, 2000) || null, category_id: f.category_id || null, years_experience: years,
        starting_price: price, state: f.state.trim() || "FCT", city: f.city.trim() || null, area: f.area.trim() || null,
        location: [f.area, f.city].filter(Boolean).join(", ") || null, is_published: f.is_published,
      }).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); void qc.invalidateQueries({ queryKey: ["provider"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5MB.");
      const path = `${provider.user_id}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      const { error } = await supabase.from("provider_profiles").update({ avatar_url: path }).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Photo updated"); void qc.invalidateQueries({ queryKey: ["provider"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className={`${card} flex flex-col items-start gap-4 sm:flex-row sm:items-center`}>
        <div className="size-20 overflow-hidden rounded-full bg-sand">
          {avatarUrl ? <img src={avatarUrl} alt="Profile photo" className="size-full object-cover" /> : <UserRound className="m-5 size-10 text-muted-warm" />}
        </div>
        <div>
          <Label htmlFor="avatar" className="cursor-pointer font-semibold text-brand">Profile photo</Label>
          <Input id="avatar" type="file" accept="image/*" className="mt-2 max-w-xs" disabled={uploadAvatar.isPending}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAvatar.mutate(file); }} />
        </div>
      </div>
      <div className={`${card} grid gap-4 sm:grid-cols-2`}>
        <Field id="public_name" label="Display name *"><Input id="public_name" value={f.public_name} onChange={set("public_name")} maxLength={100} /></Field>
        <Field id="business_name" label="Business name"><Input id="business_name" value={f.business_name} onChange={set("business_name")} maxLength={120} /></Field>
        <Field id="profession" label="Profession"><Input id="profession" value={f.profession} onChange={set("profession")} placeholder="e.g. Plumber" maxLength={100} /></Field>
        <Field id="category_id" label="Main category">
          <select id="category_id" className={selectCls} value={f.category_id} onChange={set("category_id")}>
            <option value="">Select a category</option>
            {cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2"><Field id="headline" label="Headline"><Input id="headline" value={f.headline} onChange={set("headline")} maxLength={160} placeholder="One line clients see first" /></Field></div>
        <div className="sm:col-span-2"><Field id="bio" label="Biography"><Textarea id="bio" rows={5} value={f.bio} onChange={set("bio")} maxLength={2000} /></Field></div>
        <Field id="years_experience" label="Years of experience"><Input id="years_experience" type="number" min={0} max={70} value={f.years_experience} onChange={set("years_experience")} /></Field>
        <Field id="starting_price" label="Starting price (₦)"><Input id="starting_price" type="number" min={0} value={f.starting_price} onChange={set("starting_price")} /></Field>
        <Field id="state" label="State"><Input id="state" value={f.state} onChange={set("state")} /></Field>
        <Field id="city" label="City"><Input id="city" value={f.city} onChange={set("city")} placeholder="Abuja" /></Field>
        <Field id="area" label="Area"><Input id="area" value={f.area} onChange={set("area")} placeholder="e.g. Wuse 2" /></Field>
        <label className="flex items-center gap-3 self-end text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-[var(--color-terracotta)]" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} />
          Show my profile publicly
        </label>
      </div>
      <Button type="submit" className="rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

/* ---------- services ---------- */

type ServiceForm = { id?: string; title: string; description: string; category_id: string; subcategory_id: string; price_from: string; price_type: PriceType; is_active: boolean; requires_booking: boolean; duration_minutes: string };
const emptyService: ServiceForm = { title: "", description: "", category_id: "", subcategory_id: "", price_from: "", price_type: "starting_from", is_active: true, requires_booking: false, duration_minutes: "60" };

function Services({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const services = useServices(providerId);
  const cats = useCategories();
  const [form, setForm] = useState<ServiceForm | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["provider", providerId, "services"] });

  const save = useMutation({
    mutationFn: async (s: ServiceForm) => {
      if (!s.title.trim()) throw new Error("Service name is required.");
      const price = s.price_from ? Number(s.price_from) : null;
      if (s.price_type !== "negotiable" && (price == null || isNaN(price) || price < 0)) throw new Error("Please set a valid price.");
      const row = {
        provider_id: providerId, title: s.title.trim().slice(0, 120), description: s.description.trim().slice(0, 1000) || null,
        category_id: s.category_id || null, subcategory_id: s.subcategory_id || null, price_from: price, price_type: s.price_type, is_active: s.is_active,
        requires_booking: s.requires_booking, duration_minutes: Math.min(1440, Math.max(15, Number(s.duration_minutes) || 60)),
      };
      const { error } = s.id ? await supabase.from("provider_services").update(row).eq("id", s.id) : await supabase.from("provider_services").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service saved"); setForm(null); void refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("provider_services").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Service deleted"); void refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {!form && <Button className="rounded-full" onClick={() => setForm(emptyService)}><Plus /> Add service</Button>}
      {form && (
        <form className={`${card} grid gap-4 sm:grid-cols-2`} onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
          <h2 className="font-display text-xl font-semibold text-brand sm:col-span-2">{form.id ? "Edit service" : "New service"}</h2>
          <div className="sm:col-span-2"><Field id="s-title" label="Service name *"><Input id="s-title" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
          <Field id="s-cat" label="Category">
            <select id="s-cat" className={selectCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: "" })}>
              <option value="">Select a category</option>
              {cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="s-sub" label="Subcategory">
            <select id="s-sub" className={selectCls} value={form.subcategory_id} disabled={!form.category_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}>
              <option value="">Select a subcategory</option>
              {cats.data?.subcategories.filter((s) => s.category_id === form.category_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field id="s-ptype" label="Price type">
            <select id="s-ptype" className={selectCls} value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value as PriceType })}>
              {priceTypes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field id="s-price" label={form.price_type === "negotiable" ? "Guide price (₦, optional)" : "Price (₦) *"}>
            <Input id="s-price" type="number" min={0} value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} />
          </Field>
          <div className="sm:col-span-2"><Field id="s-desc" label="Description"><Textarea id="s-desc" rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-4" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active (visible to clients)
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-4" checked={form.requires_booking} onChange={(e) => setForm({ ...form, requires_booking: e.target.checked })} /> Bookable by appointment
          </label>
          {form.requires_booking && <Field id="s-dur" label="Appointment length (minutes)">
            <Input id="s-dur" type="number" min={15} max={1440} step={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
          </Field>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save service"}</Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}
      {services.isLoading && <p className="text-muted-warm">Loading services…</p>}
      {services.data?.length === 0 && !form && <Placeholder title="No services yet" text="Add the services you offer with a price so clients know what to expect." />}
      <div className="grid gap-4 md:grid-cols-2">
        {services.data?.map((s) => (
          <article key={s.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-brand">{s.title}</h3>
                <p className="text-sm text-muted-warm">{[s.category?.name, s.subcategory?.name].filter(Boolean).join(" · ") || "Uncategorised"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.is_active ? "bg-sand text-brand" : "bg-muted text-muted-warm"}`}>{s.is_active ? "Active" : "Hidden"}</span>
            </div>
            {s.description && <p className="mt-3 line-clamp-3 text-sm">{s.description}</p>}
            <p className="mt-3 font-semibold text-terracotta-deep">{priceTypes.find((p) => p.value === s.price_type)?.label} {s.price_type === "negotiable" && s.price_from == null ? "" : naira(s.price_from)}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setForm({
                id: s.id, title: s.title, description: s.description ?? "", category_id: s.category_id ?? "", subcategory_id: s.subcategory_id ?? "",
                price_from: s.price_from?.toString() ?? "", price_type: s.price_type, is_active: s.is_active,
                requires_booking: s.requires_booking, duration_minutes: String(s.duration_minutes),
              })}><Pencil /> Edit</Button>
              <Button size="sm" variant="ghost" className="rounded-full text-destructive" disabled={remove.isPending}
                onClick={() => { if (confirm(`Delete "${s.title}"?`)) remove.mutate(s.id); }}><Trash2 /> Delete</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------- portfolio ---------- */

function Portfolio({ providerId, userId }: { providerId: string; userId: string }) {
  const qc = useQueryClient();
  const items = usePortfolio(providerId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["provider", providerId, "portfolio"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Please add a title.");
      if (!file) throw new Error("Please choose an image.");
      if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB.");
      const path = `${userId}/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const up = await supabase.storage.from("portfolio").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase.from("portfolio_items").insert({
        provider_id: providerId, title: title.trim().slice(0, 120), description: description.trim().slice(0, 500) || null, image_path: path,
      });
      if (error) { await supabase.storage.from("portfolio").remove([path]); throw error; }
    },
    onSuccess: () => { toast.success("Portfolio item added"); setTitle(""); setDescription(""); setFile(null); void refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (item: { id: string; image_path: string | null }) => {
      const { error } = await supabase.from("portfolio_items").delete().eq("id", item.id);
      if (error) throw error;
      if (item.image_path) await supabase.storage.from("portfolio").remove([item.image_path]);
    },
    onSuccess: () => { toast.success("Item removed"); void refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <form className={`${card} grid gap-4 sm:grid-cols-2`} onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <h2 className="font-display text-xl font-semibold text-brand sm:col-span-2">Upload work</h2>
        <Field id="p-title" label="Title *"><Input id="p-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field id="p-file" label="Image * (max 10MB)"><Input id="p-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <div className="sm:col-span-2"><Field id="p-desc" label="Description"><Textarea id="p-desc" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
        <Button type="submit" className="w-fit rounded-full" disabled={add.isPending}>{add.isPending ? "Uploading…" : "Add to portfolio"}</Button>
      </form>
      {items.data?.length === 0 && <Placeholder title="Your portfolio is empty" text="Show clients photos of your best work." />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.data?.map((it) => (
          <figure key={it.id} className="overflow-hidden rounded-3xl bg-primary-foreground ring-1 ring-sand-deep">
            <div className="aspect-[4/3] bg-sand">{it.url && <img src={it.url} alt={it.title} className="size-full object-cover" loading="lazy" />}</div>
            <figcaption className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0"><p className="font-semibold text-brand">{it.title}</p>{it.description && <p className="line-clamp-2 text-sm text-muted-warm">{it.description}</p>}</div>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${it.title}`}
                onClick={() => { if (confirm("Remove this item?")) remove.mutate(it); }}><Trash2 /></Button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ---------- availability ---------- */

const availabilityOpts: { value: Availability; label: string; text: string }[] = [
  { value: "available", label: "Available", text: "Accepting new jobs now." },
  { value: "busy", label: "Busy", text: "Taking requests, but responses may be slower." },
  { value: "unavailable", label: "Unavailable", text: "Not taking new jobs for now." },
];

function AvailabilityPanel({ provider }: { provider: ProviderRow }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Availability>(provider.availability_status);
  const [note, setNote] = useState(provider.availability ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("provider_profiles").update({ availability_status: status, availability: note.trim().slice(0, 200) || null }).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Availability updated"); void qc.invalidateQueries({ queryKey: ["provider"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="sr-only">Availability status</legend>
        {availabilityOpts.map((o) => (
          <label key={o.value} className={`${card} cursor-pointer ${status === o.value ? "ring-2 ring-terracotta" : ""}`}>
            <input type="radio" name="availability" className="sr-only" checked={status === o.value} onChange={() => setStatus(o.value)} />
            <p className="font-display text-lg font-semibold text-brand">{o.label}</p>
            <p className="mt-1 text-sm text-muted-warm">{o.text}</p>
          </label>
        ))}
      </fieldset>
      <div className={card}>
        <Field id="av-note" label="Working hours / note"><Input id="av-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Mon–Sat, 8am–6pm" /></Field>
      </div>
      <Button type="submit" className="rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save availability"}</Button>
    </form>
  );
}

/* ---------- account settings ---------- */

function AccountSettings({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["provider", userId, "account"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, phone").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ full_name: "", phone: "" });
  useEffect(() => { if (q.data) setF({ full_name: q.data.full_name ?? "", phone: q.data.phone ?? "" }); }, [q.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (f.phone && !/^\+?[0-9\s-]{7,20}$/.test(f.phone)) throw new Error("Please enter a valid phone number.");
      const { error } = await supabase.from("profiles").update({ full_name: f.full_name.trim().slice(0, 100) || null, phone: f.phone.trim() || null }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); void qc.invalidateQueries({ queryKey: ["provider", userId, "account"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form className={`${card} grid gap-4 sm:grid-cols-2`} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field id="acc-email" label="Email"><Input id="acc-email" value={email} disabled /></Field>
      <Field id="acc-name" label="Full name"><Input id="acc-name" value={f.full_name} maxLength={100} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
      <Field id="acc-phone" label="Phone"><Input id="acc-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+234…" /></Field>
      <div className="sm:col-span-2"><Button type="submit" className="rounded-full" disabled={save.isPending}>Save settings</Button></div>
    </form>
  );
}
