import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Plan = Database["public"]["Tables"]["subscription_plans"]["Row"];
const naira = (n: number) => (n === 0 ? "Free" : `₦${Number(n).toLocaleString()}`);
const limit = (n: number | null) => (n == null ? "Unlimited" : String(n));
const features = (p: Plan) => (Array.isArray(p.features) ? (p.features as string[]) : []);

function usePlans(all = false) {
  return useQuery({
    queryKey: ["subscription-plans", all],
    queryFn: async () => {
      let q = supabase.from("subscription_plans").select("*").order("sort_order");
      if (!all) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function ProviderSubscription({ providerId }: { providerId: string }) {
  const plans = usePlans();
  const current = useQuery({
    queryKey: ["current-plan", providerId],
    queryFn: async () => {
      const { data: planId } = await supabase.rpc("provider_current_plan", { _provider_id: providerId });
      const { data: sub } = await supabase.from("provider_subscriptions").select("*").eq("provider_id", providerId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return { planId: planId as string | null, sub };
    },
  });
  const cur = plans.data?.find((p) => p.id === current.data?.planId);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Your current plan</p>
        <h2 className="mt-1 text-2xl font-bold">{cur?.name ?? "Free"}</h2>
        {current.data?.sub && (
          <p className="mt-2 text-sm text-muted-foreground">
            Started {current.data.sub.current_period_start ? new Date(current.data.sub.current_period_start).toLocaleDateString() : "—"}
            {" · "}Ends {current.data.sub.current_period_end ? new Date(current.data.sub.current_period_end).toLocaleDateString() : "no end date"}
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.data?.map((p) => (
          <div key={p.id} className={`rounded-2xl border bg-card p-6 ${p.id === cur?.id ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center gap-2"><h3 className="text-lg font-bold">{p.name}</h3>{p.is_featured_placement && <Crown className="size-4 text-primary" />}</div>
            <p className="mt-1 text-2xl font-bold">{naira(p.price)}<span className="text-sm font-normal text-muted-foreground">{p.price > 0 ? ` / ${p.interval}` : ""}</span></p>
            <ul className="mt-4 space-y-2 text-sm">{features(p).map((f) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{f}</li>)}</ul>
            <Button className="mt-5 w-full" variant={p.id === cur?.id ? "secondary" : "default"} disabled={p.id === cur?.id} onClick={() => toast.info("Online upgrades open once payments are switched on. Contact us to upgrade now.")}>
              {p.id === cur?.id ? "Current plan" : "Upgrade"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Automatic billing is not active yet. Plans are assigned by the SERVICONNECT team until payments are set up.</p>
    </div>
  );
}

export function AdminPlans() {
  const qc = useQueryClient();
  const plans = usePlans(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const save = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("subscription_plans").update({
        name: p.name, description: p.description, price: p.price, interval: p.interval, features: p.features,
        max_services: p.max_services, max_portfolio_items: p.max_portfolio_items, visibility_rank: p.visibility_rank,
        is_featured_placement: p.is_featured_placement, is_active: p.is_active,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan saved"); setEditing(null); void qc.invalidateQueries({ queryKey: ["subscription-plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {plans.data?.map((p) => (
          <div key={p.id} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold">{p.name}</h3><span className="text-xs text-muted-foreground">{p.is_active ? "Active" : "Hidden"}</span></div>
            <p className="mt-1 text-xl font-bold">{naira(p.price)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Services: {limit(p.max_services)} · Portfolio: {limit(p.max_portfolio_items)} · Visibility level {p.visibility_rank}{p.is_featured_placement ? " · Featured" : ""}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setEditing({ ...p })}>Edit</Button>
          </div>
        ))}
      </div>
      {editing && <PlanForm plan={editing} onChange={setEditing} onSave={() => save.mutate(editing)} onCancel={() => setEditing(null)} saving={save.isPending} />}
      <ProviderSubscriptionsAdmin plans={plans.data ?? []} />
      <p className="text-xs text-muted-foreground">Automatic billing is off. Assigning a plan here does not charge the provider.</p>
    </div>
  );
}

function PlanForm({ plan, onChange, onSave, onCancel, saving }: { plan: Plan; onChange: (p: Plan) => void; onSave: () => void; onCancel: () => void; saving: boolean }) {
  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <h3 className="font-bold">Edit {plan.name}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Name<Input value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })} /></label>
        <label className="text-sm">Price (₦ per {plan.interval})<Input type="number" min={0} value={plan.price} onChange={(e) => onChange({ ...plan, price: Number(e.target.value) })} /></label>
        <label className="text-sm">Max services (blank = unlimited)<Input type="number" min={0} value={plan.max_services ?? ""} onChange={(e) => onChange({ ...plan, max_services: num(e.target.value) })} /></label>
        <label className="text-sm">Max portfolio items (blank = unlimited)<Input type="number" min={0} value={plan.max_portfolio_items ?? ""} onChange={(e) => onChange({ ...plan, max_portfolio_items: num(e.target.value) })} /></label>
        <label className="text-sm">Visibility level (0–10)<Input type="number" min={0} max={10} value={plan.visibility_rank} onChange={(e) => onChange({ ...plan, visibility_rank: Number(e.target.value) })} /></label>
        <label className="text-sm">Description<Input value={plan.description ?? ""} onChange={(e) => onChange({ ...plan, description: e.target.value })} /></label>
      </div>
      <label className="block text-sm">Features (one per line)
        <textarea className="mt-1 w-full rounded-md border bg-background p-2 text-sm" rows={4} value={features(plan).join("\n")} onChange={(e) => onChange({ ...plan, features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={plan.is_featured_placement} onChange={(e) => onChange({ ...plan, is_featured_placement: e.target.checked })} />Featured placement</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={plan.is_active} onChange={(e) => onChange({ ...plan, is_active: e.target.checked })} />Shown to providers</label>
      </div>
      <div className="flex gap-2"><Button onClick={onSave} disabled={saving}>Save plan</Button><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}

function ProviderSubscriptionsAdmin({ plans }: { plans: Plan[] }) {
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ["admin-provider-subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_subscriptions").select("*, provider_profiles(public_name, business_name)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const update = useMutation({
    mutationFn: async (v: { id: string; plan_id?: string; status?: Database["public"]["Enums"]["subscription_status"]; current_period_end?: string | null }) => {
      const { id, ...rest } = v;
      const { error } = await supabase.from("provider_subscriptions").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subscription updated"); void qc.invalidateQueries({ queryKey: ["admin-provider-subs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const statuses = ["pending", "active", "past_due", "cancelled", "expired"] as const;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-bold">Provider subscriptions</h3>
      {!subs.data?.length && <p className="mt-2 text-sm text-muted-foreground">No provider subscriptions yet.</p>}
      <div className="mt-3 divide-y">
        {subs.data?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-40 flex-1 font-medium">{s.provider_profiles?.business_name || s.provider_profiles?.public_name || "Unnamed provider (profile not completed)"}</span>
            <select aria-label="Plan" className="rounded-md border bg-background px-2 py-1" value={s.plan_id} onChange={(e) => update.mutate({ id: s.id, plan_id: e.target.value })}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select aria-label="Status" className="rounded-md border bg-background px-2 py-1" value={s.status} onChange={(e) => update.mutate({ id: s.id, status: e.target.value as (typeof statuses)[number] })}>
              {statuses.map((st) => <option key={st} value={st}>{st.replace("_", " ")}</option>)}
            </select>
            <span className="text-muted-foreground">From {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : "—"}</span>
            <label className="flex items-center gap-1 text-muted-foreground">Ends
              <input type="date" className="rounded-md border bg-background px-2 py-1" value={s.current_period_end?.slice(0, 10) ?? ""} onChange={(e) => update.mutate({ id: s.id, current_period_end: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
