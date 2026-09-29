import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, BarChart3, Bell, Briefcase, CalendarCheck, ClipboardList, CreditCard, FileText, FolderTree,
  HelpCircle, Inbox, LayoutDashboard, MapPin, Megaphone, MessageSquareWarning, Settings, ShieldCheck, Star, UserCog,
  UserRound, Users, Wrench,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const adminTabs = [
  "overview", "users", "clients", "providers", "verification", "categories", "services", "requests", "bookings",
  "reviews", "payments", "subscriptions", "advertising", "blog", "faqs", "contact", "complaints", "notifications",
  "locations", "analytics", "admins", "settings",
] as const;
export type AdminTab = (typeof adminTabs)[number];

const nav: { tab: AdminTab; label: string; icon: ReactNode }[] = [
  { tab: "overview", label: "Dashboard Overview", icon: <LayoutDashboard className="size-4" /> },
  { tab: "users", label: "Users", icon: <Users className="size-4" /> },
  { tab: "clients", label: "Clients", icon: <UserRound className="size-4" /> },
  { tab: "providers", label: "Providers", icon: <Wrench className="size-4" /> },
  { tab: "verification", label: "Provider Verification", icon: <ShieldCheck className="size-4" /> },
  { tab: "categories", label: "Service Categories", icon: <FolderTree className="size-4" /> },
  { tab: "services", label: "Services", icon: <Briefcase className="size-4" /> },
  { tab: "requests", label: "Service Requests", icon: <ClipboardList className="size-4" /> },
  { tab: "bookings", label: "Bookings", icon: <CalendarCheck className="size-4" /> },
  { tab: "reviews", label: "Reviews", icon: <Star className="size-4" /> },
  { tab: "payments", label: "Payments", icon: <CreditCard className="size-4" /> },
  { tab: "subscriptions", label: "Subscriptions", icon: <BadgeCheck className="size-4" /> },
  { tab: "advertising", label: "Advertising", icon: <Megaphone className="size-4" /> },
  { tab: "blog", label: "Blog", icon: <FileText className="size-4" /> },
  { tab: "faqs", label: "FAQs", icon: <HelpCircle className="size-4" /> },
  { tab: "contact", label: "Contact Messages", icon: <Inbox className="size-4" /> },
  { tab: "complaints", label: "Complaints", icon: <MessageSquareWarning className="size-4" /> },
  { tab: "notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { tab: "locations", label: "Locations", icon: <MapPin className="size-4" /> },
  { tab: "analytics", label: "Analytics", icon: <BarChart3 className="size-4" /> },
  { tab: "admins", label: "Admin Management", icon: <UserCog className="size-4" /> },
  { tab: "settings", label: "Site Settings", icon: <Settings className="size-4" /> },
];

const card = "rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6";
const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";
type AccountStatus = Database["public"]["Enums"]["account_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

/* All reads/writes go through the signed-in admin's session; database RLS (has_role admin) enforces access. */

function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, display_name, phone, city, status, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const roles: Record<string, AppRole[]> = {};
      r.data.forEach(({ user_id, role }) => { (roles[user_id] ??= []).push(role); });
      return p.data.map((u) => ({ ...u, roles: roles[u.user_id] ?? [] }));
    },
  });
}

function useProviders() {
  return useQuery({
    queryKey: ["admin", "providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_profiles")
        .select("id, user_id, public_name, business_name, profession, city, area, is_published, is_verified, verification_status, availability_status, rating_average, review_count, created_at, category:service_categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

async function count(table: "provider_services", filter?: (q: any) => any) {
  let q: any = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
}

export function AdminDashboard({ tab }: { tab: AdminTab }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const current = nav.find((n) => n.tab === tab) ?? nav[0]!;
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-sand-deep bg-primary-foreground">
        <div className="page-shell flex min-h-[72px] items-center justify-between">
          <Logo />
          <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
            <span className="hidden sm:inline">Sign out</span><ArrowRight className="rotate-180" />
          </Button>
        </div>
      </header>
      <main className="page-shell grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl bg-primary-foreground p-4 ring-1 ring-sand-deep lg:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber">Admin console</p>
          <p className="mt-2 truncate font-display text-lg font-semibold text-brand">{user.email}</p>
          <nav aria-label="Admin" className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <Link key={item.tab} to="/admin-dashboard" search={{ tab: item.tab }} aria-current={item.tab === tab ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${item.tab === tab ? "bg-sand text-brand" : "text-muted-warm hover:bg-cream hover:text-brand"}`}>
                {item.icon}{item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-terracotta-deep">Admin dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-brand sm:text-4xl">{current.label}</h1>
          <div className="mt-6">
            {tab === "overview" && <Overview />}
            {tab === "users" && <UsersPanel />}
            {tab === "clients" && <UsersPanel role="client" />}
            {tab === "providers" && <ProvidersPanel />}
            {tab === "verification" && <VerificationPanel />}
            {tab === "categories" && <CategoriesPanel />}
            {!["overview", "users", "clients", "providers", "verification", "categories"].includes(tab) &&
              <Placeholder title={`${current.label} is coming in a later phase`} text="This section is reserved so the admin console structure is ready as the marketplace grows." />}
          </div>
        </section>
      </main>
    </div>
  );
}

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

function State({ q }: { q: { isLoading: boolean; error: unknown } }) {
  if (q.isLoading) return <p className="text-muted-warm">Loading…</p>;
  if (q.error) return <p className="text-destructive">Couldn't load this data. Please refresh.</p>;
  return null;
}

function Overview() {
  const users = useUsers();
  const providers = useProviders();
  const services = useQuery({ queryKey: ["admin", "active-services"], queryFn: () => count("provider_services", (q) => q.eq("is_active", true)) });
  const u = users.data ?? [];
  const pending = (providers.data ?? []).filter((p) => p.verification_status === "pending");
  const v = (n: number) => (users.isLoading || providers.isLoading ? "…" : n);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total users" value={v(u.length)} icon={<Users className="size-4" />} />
        <Stat label="Clients" value={v(u.filter((x) => x.roles.includes("client")).length)} icon={<UserRound className="size-4" />} />
        <Stat label="Providers" value={v(u.filter((x) => x.roles.includes("provider")).length)} icon={<Wrench className="size-4" />} />
        <Stat label="Pending verification" value={v(pending.length)} icon={<ShieldCheck className="size-4" />} />
        <Stat label="Active services" value={services.data ?? "…"} icon={<Briefcase className="size-4" />} />
      </div>
      <div className={card}>
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-brand">Verification queue</h2>
          <Link to="/admin-dashboard" search={{ tab: "verification" }} className="text-sm font-semibold text-terracotta-deep">Review all</Link></div>
        {pending.length === 0 ? <p className="mt-3 text-sm text-muted-warm">No providers are waiting for verification.</p> :
          <ul className="mt-3 divide-y divide-sand-deep">{pending.slice(0, 5).map((p) => <li key={p.id} className="py-2 text-sm"><span className="font-semibold text-brand">{p.business_name || p.public_name || "Unnamed provider"}</span> <span className="text-muted-warm">· {p.profession ?? "—"}</span></li>)}</ul>}
      </div>
      <div className={card}>
        <h2 className="font-display text-xl font-semibold text-brand">Newest members</h2>
        <ul className="mt-3 divide-y divide-sand-deep">{u.slice(0, 5).map((x) => <li key={x.user_id} className="flex justify-between py-2 text-sm"><span className="font-semibold text-brand">{x.full_name || x.display_name || "Unnamed user"}</span><span className="capitalize text-muted-warm">{x.roles.join(", ") || "—"}</span></li>)}</ul>
      </div>
    </div>
  );
}

function UsersPanel({ role }: { role?: AppRole }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const users = useUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(role ?? "all");
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AccountStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("user_id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Account status updated"); void qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const list = (users.data ?? []).filter((u) =>
    (roleFilter === "all" || u.roles.includes(roleFilter as AppRole)) &&
    `${u.full_name ?? ""} ${u.display_name ?? ""} ${u.phone ?? ""} ${u.city ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={card}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search by name, phone or city" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!role && <select className={selectCls} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option><option value="client">Clients</option><option value="provider">Providers</option><option value="admin">Admins</option>
        </select>}
      </div>
      <State q={users} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-warm"><tr><th className="py-2">Name</th><th>Role</th><th>Phone</th><th>City</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-sand-deep">
            {list.map((u) => (
              <tr key={u.user_id}>
                <td className="py-3 font-semibold text-brand">{u.full_name || u.display_name || "Unnamed user"}</td>
                <td className="capitalize">{u.roles.join(", ") || "—"}</td>
                <td>{u.phone ?? "—"}</td><td>{u.city ?? "—"}</td>
                <td>{new Date(u.created_at).toLocaleDateString("en-NG")}</td>
                <td>
                  <select className={selectCls} value={u.status} disabled={u.user_id === user?.id || setStatus.isPending}
                    aria-label="Account status" onChange={(e) => setStatus.mutate({ id: u.user_id, status: e.target.value as AccountStatus })}>
                    <option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
                  </select>
                </td>
              </tr>
            ))}
            {!users.isLoading && list.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-warm">No users match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useProviderUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Database["public"]["Tables"]["provider_profiles"]["Update"] }) => {
      const { error } = await supabase.from("provider_profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Provider updated"); void qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
}

function ProvidersPanel() {
  const providers = useProviders();
  const update = useProviderUpdate();
  const [search, setSearch] = useState("");
  const list = (providers.data ?? []).filter((p) => `${p.business_name ?? ""} ${p.public_name ?? ""} ${p.profession ?? ""} ${p.city ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <Input placeholder="Search providers" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-primary-foreground" />
      <State q={providers} />
      {!providers.isLoading && list.length === 0 && <p className="text-muted-warm">No providers found.</p>}
      {list.map((p) => (
        <div key={p.id} className={`${card} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className="font-display text-lg font-semibold text-brand">{p.business_name || p.public_name || "Unnamed provider"} {p.is_verified && <BadgeCheck className="inline size-4 text-accent-green" />}</p>
            <p className="text-sm text-muted-warm">{p.profession ?? "No profession"} · {p.category?.name ?? "No category"} · {[p.area, p.city].filter(Boolean).join(", ") || "No location"}</p>
            <p className="mt-1 text-xs text-muted-warm">Rating {Number(p.rating_average).toFixed(1)} ({p.review_count}) · <span className="capitalize">{p.availability_status}</span> · Verification: <span className="capitalize">{p.verification_status}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.is_published ? "bg-accent-green/15 text-accent-green" : "bg-sand text-muted-warm"}`}>{p.is_published ? "Listed" : "Hidden"}</span>
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: p.id, patch: { is_published: !p.is_published } })}>{p.is_published ? "Hide from directory" : "List in directory"}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerificationPanel() {
  const providers = useProviders();
  const update = useProviderUpdate();
  const [show, setShow] = useState<"pending" | "all">("pending");
  const list = (providers.data ?? []).filter((p) => show === "all" || p.verification_status === "pending");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={show === "pending" ? "terracotta" : "outline"} onClick={() => setShow("pending")}>Pending</Button>
        <Button size="sm" variant={show === "all" ? "terracotta" : "outline"} onClick={() => setShow("all")}>All providers</Button>
      </div>
      <State q={providers} />
      {!providers.isLoading && list.length === 0 && <div className={card}><p className="text-muted-warm">No verification requests waiting.</p></div>}
      {list.map((p) => (
        <div key={p.id} className={`${card} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className="font-display text-lg font-semibold text-brand">{p.business_name || p.public_name || "Unnamed provider"}</p>
            <p className="text-sm text-muted-warm">{p.profession ?? "—"} · Status: <span className="font-semibold capitalize">{p.verification_status}</span></p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="terracotta" disabled={update.isPending || p.verification_status === "verified"}
              onClick={() => update.mutate({ id: p.id, patch: { verification_status: "verified", is_verified: true } })}>Approve</Button>
            <Button size="sm" variant="outline" disabled={update.isPending || p.verification_status === "rejected"}
              onClick={() => update.mutate({ id: p.id, patch: { verification_status: "rejected", is_verified: false } })}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CategoriesPanel() {
  const qc = useQueryClient();
  const cats = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const [c, s] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort_order"),
        supabase.from("service_subcategories").select("*").order("sort_order"),
      ]);
      if (c.error) throw c.error;
      if (s.error) throw s.error;
      return c.data.map((cat) => ({ ...cat, subs: s.data.filter((x) => x.category_id === cat.id) }));
    },
  });
  const done = (msg: string) => { toast.success(msg); void qc.invalidateQueries({ queryKey: ["admin", "categories"] }); void qc.invalidateQueries({ queryKey: ["catalog"] }); };
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const addCat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_categories").insert({ name: name.trim(), slug: slugify(name), description: description.trim() || null, sort_order: (cats.data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setDescription(""); done("Category added"); }, onError: fail,
  });
  const toggleCat = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { const { error } = await supabase.from("service_categories").update({ is_active }).eq("id", id); if (error) throw error; },
    onSuccess: () => done("Category updated"), onError: fail,
  });
  const renameCat = useMutation({
    mutationFn: async ({ id, name: n }: { id: string; name: string }) => { const { error } = await supabase.from("service_categories").update({ name: n }).eq("id", id); if (error) throw error; },
    onSuccess: () => done("Category renamed"), onError: fail,
  });
  const addSub = useMutation({
    mutationFn: async ({ category_id, name: n }: { category_id: string; name: string }) => { const { error } = await supabase.from("service_subcategories").insert({ category_id, name: n, slug: slugify(n) }); if (error) throw error; },
    onSuccess: () => done("Subcategory added"), onError: fail,
  });
  const toggleSub = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { const { error } = await supabase.from("service_subcategories").update({ is_active }).eq("id", id); if (error) throw error; },
    onSuccess: () => done("Subcategory updated"), onError: fail,
  });

  return (
    <div className="space-y-4">
      <form className={`${card} grid gap-3 md:grid-cols-[1fr_2fr_auto]`} onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) { toast.error("Enter a category name"); return; } addCat.mutate(); }}>
        <Input placeholder="New category name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Short description (optional)" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
        <Button type="submit" variant="terracotta" disabled={addCat.isPending}>Add category</Button>
      </form>
      <State q={cats} />
      {cats.data?.map((c) => <CategoryRow key={c.id} c={c}
        onToggle={() => toggleCat.mutate({ id: c.id, is_active: !c.is_active })}
        onRename={(n) => renameCat.mutate({ id: c.id, name: n })}
        onAddSub={(n) => addSub.mutate({ category_id: c.id, name: n })}
        onToggleSub={(id, active) => toggleSub.mutate({ id, is_active: active })} />)}
    </div>
  );
}

type CatRow = Database["public"]["Tables"]["service_categories"]["Row"] & { subs: Database["public"]["Tables"]["service_subcategories"]["Row"][] };

function CategoryRow({ c, onToggle, onRename, onAddSub, onToggleSub }: { c: CatRow; onToggle: () => void; onRename: (n: string) => void; onAddSub: (n: string) => void; onToggleSub: (id: string, active: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(c.name);
  const [sub, setSub] = useState("");
  return (
    <div className={card}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {editing ? (
          <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (label.trim().length >= 2) { onRename(label.trim()); setEditing(false); } }}>
            <Input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} /><Button type="submit" size="sm">Save</Button>
          </form>
        ) : (
          <div>
            <p className="font-display text-lg font-semibold text-brand">{c.name} {!c.is_active && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs text-muted-warm">Hidden</span>}</p>
            <p className="text-sm text-muted-warm">{c.subs.length} subcategories · /{c.slug}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Subcategories"}</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>Rename</Button>
          <Button size="sm" variant="outline" onClick={onToggle}>{c.is_active ? "Hide" : "Show"}</Button>
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-sand-deep pt-4">
          <div className="flex flex-wrap gap-2">
            {c.subs.map((s) => (
              <button key={s.id} type="button" onClick={() => onToggleSub(s.id, !s.is_active)} title={s.is_active ? "Click to hide" : "Click to show"}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${s.is_active ? "bg-sand text-brand" : "bg-cream text-muted-warm line-through"}`}>{s.name}</button>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sub.trim().length >= 2) { onAddSub(sub.trim()); setSub(""); } }}>
            <Input placeholder="Add subcategory" value={sub} maxLength={80} onChange={(e) => setSub(e.target.value)} /><Button type="submit" size="sm" variant="terracotta">Add</Button>
          </form>
        </div>
      )}
    </div>
  );
}
