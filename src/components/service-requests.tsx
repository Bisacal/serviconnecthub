import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, CalendarCheck, Clock, MapPin, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth-provider";
import { PublicLayout } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Status = Database["public"]["Enums"]["request_status"];

const statusStyle: Record<Status, string> = {
  pending: "bg-amber/15 text-terracotta-deep",
  accepted: "bg-accent-green/15 text-accent-green",
  in_progress: "bg-sand text-brand",
  completed: "bg-accent-green/15 text-accent-green",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-warm",
};
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[status]}`}>{status.replace("_", " ")}</span>;
}
const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);
const naira = (n: number | null) => (n == null ? "" : `₦${Number(n).toLocaleString("en-NG")}`);

/* ---------- request form ---------- */

export function RequestServiceDialog({ providerId, providerName, open, onOpenChange }: { providerId: string; providerName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const services = useQuery({
    queryKey: ["public-services", providerId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_services").select("id, title, price_from, price_type").eq("provider_id", providerId).eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ service_id: "", title: "", details: "", location: "", preferred_date: "", preferred_time: "" });
  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      const svc = services.data?.find((s) => s.id === form.service_id);
      const { error } = await supabase.from("service_requests").insert({
        client_id: user.id, provider_id: providerId, service_id: svc?.id ?? null,
        title: (form.title.trim() || svc?.title || "Service request").slice(0, 150),
        details: form.details.trim().slice(0, 2000), location: form.location.trim().slice(0, 200),
        preferred_date: form.preferred_date || null, preferred_time: form.preferred_time.trim().slice(0, 50) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent", { description: `${providerName} has been notified.` });
      void qc.invalidateQueries({ queryKey: ["client"] });
      onOpenChange(false);
      void navigate({ to: "/dashboard", search: { tab: "requests" } });
    },
    onError: (e) => toast.error("Couldn't send your request", { description: e instanceof Error && e.message !== "auth" ? e.message : undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand">Request {providerName}</DialogTitle>
          <DialogDescription>Describe the job. The provider will accept or decline it.</DialogDescription>
        </DialogHeader>
        {!user ? (
          <div className="grid gap-3 text-sm text-muted-warm">
            <p>Please sign in as a client to send a service request.</p>
            <Button asChild className="rounded-full"><Link to="/auth" search={{ mode: "login", role: "client" }}>Sign in</Link></Button>
          </div>
        ) : role !== "client" ? (
          <p className="text-sm text-muted-warm">Only client accounts can send service requests.</p>
        ) : (
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!form.service_id && !form.title.trim()) return toast.error("Choose a service or give the job a title");
            if (form.details.trim().length < 10) return toast.error("Please describe the job (at least 10 characters)");
            if (!form.location.trim()) return toast.error("Please enter the job location");
            submit.mutate();
          }}>
            <div className="grid gap-1.5">
              <Label htmlFor="rq-service">Service</Label>
              <select id="rq-service" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                <option value="">Other / not listed</option>
                {services.data?.map((s) => <option key={s.id} value={s.id}>{s.title}{s.price_from != null ? ` — ${naira(s.price_from)}` : ""}</option>)}
              </select>
            </div>
            {!form.service_id && <div className="grid gap-1.5"><Label htmlFor="rq-title">Job title</Label><Input id="rq-title" maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fix leaking kitchen sink" /></div>}
            <div className="grid gap-1.5"><Label htmlFor="rq-details">Description</Label><Textarea id="rq-details" maxLength={2000} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="rq-loc">Location</Label><Input id="rq-loc" maxLength={200} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Wuse 2, Abuja" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label htmlFor="rq-date">Preferred date</Label><Input id="rq-date" type="date" min={today()} value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="rq-time">Preferred time (optional)</Label><Input id="rq-time" maxLength={50} value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} placeholder="e.g. Morning, 10am" /></div>
            </div>
            <Button type="submit" className="rounded-full" disabled={submit.isPending}>{submit.isPending ? "Sending…" : "Send request"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- real provider profile (database providers) ---------- */

export function LiveProviderProfile({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const q = useQuery({
    queryKey: ["public-provider", id],
    enabled: isUuid,
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_profiles")
        .select("id, public_name, business_name, profession, headline, bio, city, area, rating_average, review_count, is_verified, years_experience, availability_status")
        .eq("id", id).eq("is_published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const p = q.data;
  if (isUuid && q.isLoading) return <PublicLayout><main className="page-shell py-20 text-center text-muted-warm">Loading…</main></PublicLayout>;
  if (!p) return <PublicLayout><main className="page-shell py-20 text-center"><h1 className="font-display text-4xl font-semibold text-brand">Provider not found</h1><p className="mt-3 text-sm text-muted-warm">This profile is not available.</p><Button asChild variant="terracotta" className="mt-6 rounded-full"><Link to="/directory" search={{ service: "", location: "Abuja, FCT" }}>Back to directory <ArrowRight /></Link></Button></main></PublicLayout>;
  const name = p.public_name || p.business_name || "Service provider";
  return (
    <PublicLayout>
      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl bg-primary-foreground p-6 ring-1 ring-sand-deep sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-terracotta-deep">{p.profession ?? "Professional"}</p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-4xl font-semibold text-brand">{name}{p.is_verified && <BadgeCheck className="size-6 text-accent-green" aria-label="Verified" />}</h1>
          {p.headline && <p className="mt-2 text-muted-warm">{p.headline}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-warm">
            <span className="flex items-center gap-1"><MapPin className="size-4" />{[p.area, p.city].filter(Boolean).join(", ") || "Abuja"}</span>
            <span className="flex items-center gap-1"><Star className="size-4 fill-amber text-amber" />{Number(p.rating_average).toFixed(1)} ({p.review_count})</span>
            {p.years_experience != null && <span>{p.years_experience} yrs experience</span>}
            <span className="capitalize">{p.availability_status}</span>
          </div>
          {p.bio && <p className="mt-6 whitespace-pre-line text-ink">{p.bio}</p>}
        </section>
        <aside className="h-fit rounded-3xl bg-primary-foreground p-6 ring-1 ring-sand-deep">
          <Button variant="brand" size="lg" className="w-full rounded-full" onClick={() => setOpen(true)}><CalendarCheck className="size-4" /> Send service request</Button>
        </aside>
      </main>
      <RequestServiceDialog providerId={p.id} providerName={name} open={open} onOpenChange={setOpen} />
    </PublicLayout>
  );
}

/* ---------- request lists ---------- */

type Row = Database["public"]["Tables"]["service_requests"]["Row"] & { provider?: { public_name: string | null; business_name: string | null } | null };

function RequestCard({ r, who, actions }: { r: Row; who?: string; actions?: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-cream p-4 ring-1 ring-sand-deep">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold text-brand">{r.title}</p>{who && <p className="text-sm text-muted-warm">{who}</p>}</div>
        <StatusBadge status={r.status} />
      </div>
      {r.details && <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.details}</p>}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-warm">
        {r.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{r.location}</span>}
        {r.preferred_date && <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" />{fmt(r.preferred_date)}</span>}
        {r.preferred_time && <span className="flex items-center gap-1"><Clock className="size-3.5" />{r.preferred_time}</span>}
        <span>Sent {fmt(r.created_at)}</span>
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

function useStatusChange(key: unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(`Request ${v.status.replace("_", " ")}`); void qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error("Couldn't update the request", { description: e instanceof Error ? e.message : undefined }),
  });
}

export function ClientRequests({ userId }: { userId: string }) {
  const key = ["client", userId, "all-requests"];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("service_requests").select("*, provider:provider_profiles(public_name, business_name)").eq("client_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });
  const change = useStatusChange(["client", userId]);
  if (q.isLoading) return <p className="text-sm text-muted-warm">Loading…</p>;
  if (!q.data?.length) return <div className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">You haven't sent any requests yet. Open a provider's profile and tap "Send service request".<div className="mt-4"><Button asChild size="sm" className="rounded-full"><Link to="/directory">Browse providers</Link></Button></div></div>;
  return (
    <ul className="grid gap-3">
      {q.data.map((r) => (
        <RequestCard key={r.id} r={r} who={r.provider ? `To ${r.provider.public_name || r.provider.business_name || "provider"}` : undefined}
          actions={(r.status === "pending" || r.status === "accepted") && (
            <Button size="sm" variant="outline" className="rounded-full" disabled={change.isPending} onClick={() => { if (confirm("Cancel this request?")) change.mutate({ id: r.id, status: "cancelled" }); }}>Cancel request</Button>
          )} />
      ))}
    </ul>
  );
}

const next: Partial<Record<Status, { status: Status; label: string; variant?: "outline" }[]>> = {
  pending: [{ status: "accepted", label: "Accept" }, { status: "declined", label: "Decline", variant: "outline" }],
  accepted: [{ status: "in_progress", label: "Start job" }],
  in_progress: [{ status: "completed", label: "Mark completed" }],
};

export function ProviderRequests({ providerId }: { providerId: string }) {
  const key = ["provider", providerId, "requests"];
  const [filter, setFilter] = useState<"open" | "all">("open");
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("service_requests").select("*").eq("provider_id", providerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });
  const change = useStatusChange(key);
  const rows = (q.data ?? []).filter((r) => filter === "all" || ["pending", "accepted", "in_progress"].includes(r.status));
  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        {(["open", "all"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(f)}>{f === "open" ? "Open requests" : "All requests"}</Button>)}
      </div>
      {q.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">No requests here yet. Publish your profile so clients can find you.</div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} actions={next[r.status]?.map((a) => (
              <Button key={a.status} size="sm" variant={a.variant ?? "default"} className="rounded-full" disabled={change.isPending} onClick={() => change.mutate({ id: r.id, status: a.status })}>{a.label}</Button>
            ))} />
          ))}
        </ul>
      )}
    </div>
  );
}
