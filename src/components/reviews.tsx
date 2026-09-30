import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${size} ${i <= Math.round(value) ? "fill-amber text-amber" : "text-sand-deep"}`} />)}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => onChange(i)} className="rounded p-0.5 focus-visible:ring-2 focus-visible:ring-ring">
          <Star className={`size-8 ${i <= value ? "fill-amber text-amber" : "text-sand-deep"}`} />
        </button>
      ))}
    </div>
  );
}

type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string | null; is_hidden: boolean; moderation_note: string | null; provider_id: string; request_id: string };

function ReviewItem({ r, extra }: { r: ReviewRow; extra?: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-cream p-4 ring-1 ring-sand-deep">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Stars value={r.rating} /><span className="text-sm font-semibold text-brand">{r.reviewer_name ?? "Client"}</span></div>
        <span className="text-xs text-muted-warm">{fmt(r.created_at)}</span>
      </div>
      {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.comment}</p>}
      {r.is_hidden && <p className="mt-2 text-xs font-semibold text-destructive">Hidden by moderators{r.moderation_note ? `: ${r.moderation_note}` : ""}</p>}
      {extra && <div className="mt-3 flex flex-wrap gap-2">{extra}</div>}
    </li>
  );
}

function Summary({ rows }: { rows: ReviewRow[] }) {
  const visible = rows.filter((r) => !r.is_hidden);
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-4xl font-semibold text-brand">{avg.toFixed(1)}</span>
      <div><Stars value={avg} /><p className="text-sm text-muted-warm">{visible.length} review{visible.length === 1 ? "" : "s"}</p></div>
    </div>
  );
}

const cols = "id, rating, comment, created_at, reviewer_name, is_hidden, moderation_note, provider_id, request_id";

/* ---------- client: write review ---------- */

export function ReviewDialog({ requestId, providerId, userId, existing, open, onOpenChange }: { requestId: string; providerId: string; userId: string; existing?: ReviewRow | undefined; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const payload = { rating, comment: comment.trim().slice(0, 1500) || null };
      const { error } = existing
        ? await supabase.from("reviews").update(payload).eq("id", existing.id)
        : await supabase.from("reviews").insert({ ...payload, request_id: requestId, provider_id: providerId, client_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(existing ? "Review updated" : "Thanks for your review!"); void qc.invalidateQueries({ queryKey: ["client", userId] }); onOpenChange(false); },
    onError: (e) => toast.error("Couldn't save your review", { description: e instanceof Error && /duplicate/i.test(e.message) ? "You've already reviewed this job." : undefined }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand">{existing ? "Edit your review" : "Rate this job"}</DialogTitle>
          <DialogDescription>Your review helps other clients choose with confidence.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!rating) { toast.error("Please choose a star rating"); return; } save.mutate(); }}>
          <StarPicker value={rating} onChange={setRating} />
          <div className="grid gap-1.5"><Label htmlFor="rv-comment">Comment</Label><Textarea id="rv-comment" maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did the job go?" /></div>
          <Button type="submit" className="rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : "Submit review"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useClientReviews(userId: string) {
  return useQuery({
    queryKey: ["client", userId, "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select(cols).eq("client_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReviewRow[];
    },
  });
}

export function ReviewButton({ requestId, providerId, userId }: { requestId: string; providerId: string; userId: string }) {
  const reviews = useClientReviews(userId);
  const [open, setOpen] = useState(false);
  const existing = reviews.data?.find((r) => r.request_id === requestId);
  return (
    <>
      <Button size="sm" variant={existing ? "outline" : "default"} className="rounded-full" onClick={() => setOpen(true)}>
        {existing ? `Your rating: ${existing.rating}★ · Edit` : "Leave a review"}
      </Button>
      {open && <ReviewDialog requestId={requestId} providerId={providerId} userId={userId} existing={existing} open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function ClientReviews({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const q = useClientReviews(userId);
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Review deleted"); void qc.invalidateQueries({ queryKey: ["client", userId] }); },
  });
  if (q.isLoading) return <p className="text-sm text-muted-warm">Loading…</p>;
  if (!q.data?.length) return <p className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">No reviews yet. When a job is completed, open "My Service Requests" and tap "Leave a review".</p>;
  return (
    <ul className="grid gap-3">
      {q.data.map((r) => <ReviewItem key={r.id} r={r} extra={<Button size="sm" variant="outline" className="rounded-full" disabled={del.isPending} onClick={() => { if (confirm("Delete this review?")) del.mutate(r.id); }}>Delete</Button>} />)}
    </ul>
  );
}

/* ---------- provider & public ---------- */

export function ProviderReviews({ providerId }: { providerId: string }) {
  const q = useQuery({
    queryKey: ["provider", providerId, "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select(cols).eq("provider_id", providerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReviewRow[];
    },
  });
  if (q.isLoading) return <p className="text-sm text-muted-warm">Loading…</p>;
  const rows = q.data ?? [];
  return (
    <div className="grid gap-5 rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6">
      <Summary rows={rows} />
      {rows.length ? <ul className="grid gap-3">{rows.map((r) => <ReviewItem key={r.id} r={r} />)}</ul> : <p className="text-sm text-muted-warm">No reviews yet. Clients can review you after you mark a job as completed.</p>}
    </div>
  );
}

export function PublicReviews({ providerId }: { providerId: string }) {
  const q = useQuery({
    queryKey: ["public-reviews", providerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select(cols).eq("provider_id", providerId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as ReviewRow[];
    },
  });
  const rows = q.data ?? [];
  return (
    <section className="mt-8">
      <h2 className="mb-4 font-display text-2xl font-semibold text-brand">Reviews</h2>
      <Summary rows={rows} />
      {rows.length ? <ul className="mt-4 grid gap-3">{rows.map((r) => <ReviewItem key={r.id} r={r} />)}</ul> : !q.isLoading && <p className="mt-3 text-sm text-muted-warm">No reviews yet.</p>}
    </section>
  );
}

/* ---------- admin moderation ---------- */

export function AdminReviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "hidden" | "low">("all");
  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select(`${cols}, provider:provider_profiles(public_name, business_name)`).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as (ReviewRow & { provider: { public_name: string | null; business_name: string | null } | null })[];
    },
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const moderate = useMutation({
    mutationFn: async ({ id, hide }: { id: string; hide: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_hidden: hide, moderation_note: hide ? (notes[id]?.trim().slice(0, 300) || null) : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.hide ? "Review hidden" : "Review restored"); void qc.invalidateQueries({ queryKey: ["admin", "reviews"] }); },
    onError: () => toast.error("Couldn't update the review"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Review deleted"); void qc.invalidateQueries({ queryKey: ["admin", "reviews"] }); },
  });
  const rows = (q.data ?? []).filter((r) => filter === "all" || (filter === "hidden" ? r.is_hidden : r.rating <= 2));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {([["all", "All reviews"], ["low", "1–2 stars"], ["hidden", "Hidden"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(k)}>{l}</Button>)}
      </div>
      {q.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : !rows.length ? <p className="rounded-2xl border border-dashed border-sand-deep p-6 text-center text-sm text-muted-warm">No reviews to show.</p> : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <ReviewItem key={r.id} r={r} extra={<>
              <span className="w-full text-xs text-muted-warm">For {r.provider?.public_name || r.provider?.business_name || "provider"}</span>
              {!r.is_hidden && <Input className="h-9 max-w-xs" placeholder="Reason (optional)" maxLength={300} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />}
              <Button size="sm" variant={r.is_hidden ? "default" : "outline"} className="rounded-full" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: r.id, hide: !r.is_hidden })}>{r.is_hidden ? "Restore" : "Hide"}</Button>
              <Button size="sm" variant="outline" className="rounded-full text-destructive" disabled={del.isPending} onClick={() => { if (confirm("Permanently delete this review?")) del.mutate(r.id); }}>Delete</Button>
            </>} />
          ))}
        </ul>
      )}
    </div>
  );
}
