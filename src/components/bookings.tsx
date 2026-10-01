import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Clock, MapPin, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageButton } from "@/components/messages";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BStatus = Database["public"]["Enums"]["booking_status"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  service?: { title: string } | null;
  provider?: { public_name: string | null; business_name: string | null } | null;
};

export const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const card = "rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6";
const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const statusStyle: Record<BStatus, string> = {
  pending: "bg-amber/15 text-terracotta-deep",
  confirmed: "bg-accent-green/15 text-accent-green",
  completed: "bg-sand text-brand",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-warm",
};

const toMin = (t: string) => { const [h = "0", m = "0"] = t.split(":"); return Number(h) * 60 + Number(m); };
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hhmm = (t: string) => t.slice(0, 5);
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const todayStr = () => new Date().toISOString().slice(0, 10);

function useAvailability(providerId: string, enabled = true) {
  return useQuery({
    queryKey: ["availability", providerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_availability").select("*").eq("provider_id", providerId).order("weekday").order("start_time");
      if (error) throw error;
      return data;
    },
  });
}

/* ---------- client: booking dialog ---------- */

export function BookingDialog({ providerId, providerName, open, onOpenChange }: { providerId: string; providerName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ service_id: "", date: "", time: "", location: "", notes: "" });

  const services = useQuery({
    queryKey: ["bookable-services", providerId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_services").select("id, title, duration_minutes, requires_booking").eq("provider_id", providerId).eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
  const availability = useAvailability(providerId, open);
  const busy = useQuery({
    queryKey: ["busy", providerId, form.date],
    enabled: open && !!form.date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_busy_slots", { _provider_id: providerId, _date: form.date });
      if (error) throw error;
      return data;
    },
  });

  const svcList = (services.data ?? []).filter((s) => s.requires_booking).length ? (services.data ?? []).filter((s) => s.requires_booking) : services.data ?? [];
  const svc = svcList.find((s) => s.id === form.service_id);
  const duration = svc?.duration_minutes ?? 60;

  // Slots: within provider's weekly hours (or 08:00–18:00 if none set), skipping confirmed bookings.
  const slots = useMemo(() => {
    if (!form.date) return [];
    const dow = new Date(`${form.date}T00:00:00`).getDay();
    const all = availability.data ?? [];
    const windows = all.length ? all.filter((a) => a.weekday === dow).map((a) => [toMin(a.start_time), toMin(a.end_time)] as const) : [[8 * 60, 18 * 60] as const];
    const taken = (busy.data ?? []).map((b) => [toMin(b.start_time), toMin(b.end_time)] as const);
    const now = new Date();
    const nowMin = form.date === todayStr() ? now.getHours() * 60 + now.getMinutes() : -1;
    const out: string[] = [];
    for (const [s, e] of windows) {
      for (let t = s; t + duration <= e; t += 30) {
        if (t <= nowMin) continue;
        if (taken.some(([bs, be]) => bs < t + duration && be > t)) continue;
        out.push(toTime(t));
      }
    }
    return out;
  }, [form.date, availability.data, busy.data, duration]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in");
      const start = toMin(form.time);
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id, provider_id: providerId, service_id: svc?.id ?? null, booking_date: form.date,
        start_time: form.time, end_time: toTime(Math.min(start + duration, 24 * 60 - 1)),
        location: form.location.trim().slice(0, 200) || null, notes: form.notes.trim().slice(0, 1000) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking requested", { description: `${providerName} will confirm or decline.` });
      void qc.invalidateQueries({ queryKey: ["client"] });
      onOpenChange(false);
      void navigate({ to: "/dashboard", search: { tab: "bookings" } });
    },
    onError: (e: Error) => toast.error("Couldn't book", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand">Book {providerName}</DialogTitle>
          <DialogDescription>Choose a date and time. The provider confirms each booking.</DialogDescription>
        </DialogHeader>
        {!user ? (
          <Button asChild className="rounded-full"><Link to="/auth" search={{ mode: "login", role: "client" }}>Sign in to book</Link></Button>
        ) : role !== "client" ? (
          <p className="text-sm text-muted-warm">Only client accounts can make bookings.</p>
        ) : (
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!form.date || !form.time) { toast.error("Please choose a date and time"); return; }
            submit.mutate();
          }}>
            <div className="grid gap-1.5">
              <Label htmlFor="bk-svc">Service</Label>
              <select id="bk-svc" className={selectCls} value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value, time: "" })}>
                <option value="">General appointment (1 hour)</option>
                {svcList.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.duration_minutes} min)</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bk-date">Date</Label>
              <Input id="bk-date" type="date" min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })} />
            </div>
            {form.date && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">Time</legend>
                {busy.isLoading || availability.isLoading ? <p className="text-sm text-muted-warm">Checking availability…</p> : slots.length === 0 ? (
                  <p className="text-sm text-muted-warm">No free times on this day. Try another date.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((t) => (
                      <button key={t} type="button" aria-pressed={form.time === t} onClick={() => setForm({ ...form, time: t })}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${form.time === t ? "bg-brand text-primary-foreground ring-brand" : "bg-cream text-brand ring-sand-deep hover:ring-terracotta"}`}>{t}</button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
            <div className="grid gap-1.5"><Label htmlFor="bk-loc">Location (optional)</Label><Input id="bk-loc" maxLength={200} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Garki, Abuja" /></div>
            <div className="grid gap-1.5"><Label htmlFor="bk-notes">Notes (optional)</Label><Textarea id="bk-notes" maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything the provider should know" /></div>
            <Button type="submit" className="rounded-full" disabled={submit.isPending || !form.time}>{submit.isPending ? "Booking…" : "Request booking"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- shared list ---------- */

function BookingCard({ b, who, actions }: { b: Booking; who?: string | undefined; actions?: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-cream p-4 ring-1 ring-sand-deep">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand">{b.service?.title ?? "Appointment"}</p>
          {who && <p className="text-sm text-muted-warm">{who}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[b.status]}`}>{b.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-warm">
        <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" />{fmtDate(b.booking_date)}</span>
        <span className="flex items-center gap-1"><Clock className="size-3.5" />{hhmm(b.start_time)}–{hhmm(b.end_time)}</span>
        {b.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{b.location}</span>}
      </div>
      {b.notes && <p className="mt-2 text-sm text-ink">{b.notes}</p>}
      {b.provider_note && <p className="mt-2 rounded-xl bg-sand/60 p-2 text-sm text-brand">Provider note: {b.provider_note}</p>}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

function useBookingUpdate(key: unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, provider_note }: { id: string; status: BStatus; provider_note?: string }) => {
      const patch: Database["public"]["Tables"]["bookings"]["Update"] = { status };
      if (provider_note) patch.provider_note = provider_note.slice(0, 1000);
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(`Booking ${v.status}`); void qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error("Couldn't update booking", { description: e.message }),
  });
}

const isUpcoming = (b: Booking) => ["pending", "confirmed"].includes(b.status);

export function ClientBookings({ userId }: { userId: string }) {
  const key = ["client", userId, "bookings"];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*, service:provider_services(title), provider:provider_profiles(public_name, business_name)")
        .eq("client_id", userId).order("booking_date", { ascending: false }).order("start_time", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });
  const update = useBookingUpdate(key);
  if (q.isLoading) return <p className="text-sm text-muted-warm">Loading…</p>;
  if (!q.data?.length) return <div className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">No bookings yet. Open a provider's profile and tap "Book appointment".<div className="mt-4"><Button asChild size="sm" className="rounded-full"><Link to="/directory">Browse providers</Link></Button></div></div>;
  return (
    <ul className="grid gap-3">
      {q.data.map((b) => (
        <BookingCard key={b.id} b={b} who={b.provider ? `With ${b.provider.public_name || b.provider.business_name || "provider"}` : undefined}
          actions={<><MessageButton clientId={userId} providerId={b.provider_id} dashboard="/dashboard" />{isUpcoming(b) && <Button size="sm" variant="outline" className="rounded-full" disabled={update.isPending}
            onClick={() => { if (confirm("Cancel this booking?")) update.mutate({ id: b.id, status: "cancelled" }); }}>Cancel booking</Button>}</>} />
      ))}
    </ul>
  );
}

/* ---------- provider ---------- */

export function ProviderBookings({ providerId }: { providerId: string }) {
  const key = ["provider", providerId, "bookings"];
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*, service:provider_services(title)")
        .eq("provider_id", providerId).order("booking_date").order("start_time");
      if (error) throw error;
      return data as Booking[];
    },
  });
  const update = useBookingUpdate(key);
  const rows = (q.data ?? []).filter((b) => filter === "all" || isUpcoming(b));
  const act = (b: Booking, status: BStatus) => {
    const note = status === "declined" || status === "cancelled" ? prompt("Optional note to the client") ?? undefined : undefined;
    update.mutate(note ? { id: b.id, status, provider_note: note } : { id: b.id, status });
  };
  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        {(["upcoming", "all"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(f)}>{f === "upcoming" ? "Upcoming" : "All bookings"}</Button>)}
      </div>
      {q.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">No bookings here yet. Set your weekly hours under Availability so clients can book you.</div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((b) => (
            <BookingCard key={b.id} b={b} actions={<><MessageButton clientId={b.client_id} providerId={b.provider_id} dashboard="/provider-dashboard" />
              {b.status === "pending" && <>
                <Button size="sm" className="rounded-full" disabled={update.isPending} onClick={() => act(b, "confirmed")}>Accept</Button>
                <Button size="sm" variant="outline" className="rounded-full" disabled={update.isPending} onClick={() => act(b, "declined")}>Decline</Button>
              </>}
              {b.status === "confirmed" && <>
                <Button size="sm" className="rounded-full" disabled={update.isPending} onClick={() => act(b, "completed")}>Mark completed</Button>
                <Button size="sm" variant="outline" className="rounded-full" disabled={update.isPending} onClick={() => act(b, "cancelled")}>Cancel</Button>
              </>}
            </>} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeeklySchedule({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const q = useAvailability(providerId);
  const [row, setRow] = useState({ weekday: "1", start: "09:00", end: "17:00" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["availability", providerId] });
  const add = useMutation({
    mutationFn: async () => {
      if (row.end <= row.start) throw new Error("End time must be after start time");
      const { error } = await supabase.from("provider_availability").insert({ provider_id: providerId, weekday: Number(row.weekday), start_time: row.start, end_time: row.end });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Hours added"); void refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("provider_availability").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className={`${card} space-y-4`}>
      <div>
        <h2 className="font-display text-xl font-semibold text-brand">Booking hours</h2>
        <p className="text-sm text-muted-warm">Clients can only book inside these weekly hours. If you set none, clients can request any time between 08:00 and 18:00.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="grid gap-1.5"><Label htmlFor="av-day">Day</Label>
          <select id="av-day" className={selectCls} value={row.weekday} onChange={(e) => setRow({ ...row, weekday: e.target.value })}>
            {weekdays.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select></div>
        <div className="grid gap-1.5"><Label htmlFor="av-start">From</Label><Input id="av-start" type="time" value={row.start} onChange={(e) => setRow({ ...row, start: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label htmlFor="av-end">To</Label><Input id="av-end" type="time" value={row.end} onChange={(e) => setRow({ ...row, end: e.target.value })} /></div>
        <Button className="rounded-full" disabled={add.isPending} onClick={() => add.mutate()}><Plus /> Add</Button>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : !q.data?.length ? <p className="text-sm text-muted-warm">No hours set yet.</p> : (
        <ul className="divide-y divide-sand-deep">
          {q.data.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="font-semibold text-brand">{weekdays[a.weekday]}</span> · {hhmm(a.start_time)}–{hhmm(a.end_time)}</span>
              <Button size="icon" variant="ghost" aria-label="Remove hours" onClick={() => remove.mutate(a.id)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
