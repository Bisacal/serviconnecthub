import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const card = "rounded-3xl bg-primary-foreground ring-1 ring-sand-deep";
const time = (d: string) => new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function useConversations(enabled = true) {
  return useQuery({
    queryKey: ["conversations"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_conversations");
      if (error) throw error;
      return data;
    },
  });
}

export function UnreadBadge() {
  const q = useConversations();
  const n = (q.data ?? []).reduce((s, c) => s + c.unread, 0);
  if (!n) return null;
  return <span className="ml-auto rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-primary-foreground" aria-label={`${n} unread messages`}>{n}</span>;
}

/** Opens a conversation; the database only allows it when a request or booking links the two users. */
export function MessageButton({ clientId, providerId, dashboard }: { clientId: string; providerId: string; dashboard: "/dashboard" | "/provider-dashboard" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("start_conversation", { _client_id: clientId, _provider_id: providerId });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => { void qc.invalidateQueries({ queryKey: ["conversations"] }); void navigate({ to: dashboard, search: { tab: "messages", c: id } }); },
    onError: (e: Error) => toast.error("Couldn't open messages", { description: e.message }),
  });
  return <Button size="sm" variant="ghost" className="rounded-full" disabled={start.isPending} onClick={() => start.mutate()}><MessageSquare className="size-4" /> Message</Button>;
}

export function Inbox({ userId, selected, onSelect }: { userId: string; selected?: string | undefined; onSelect: (id: string) => void }) {
  const convs = useConversations();
  const list = convs.data ?? [];
  const active = selected ?? list[0]?.id;

  if (convs.isLoading) return <div className={`${card} p-6 text-sm text-muted-warm`}>Loading…</div>;
  if (!list.length) return (
    <div className={`${card} p-6 text-center text-sm text-muted-warm`}>
      No conversations yet. You can message someone once you share a service request or booking — use the "Message" button on it.
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <ul className={`${card} max-h-[560px] overflow-y-auto p-2`} aria-label="Conversations">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onSelect(c.id)} aria-current={c.id === active ? "true" : undefined}
              className={`flex w-full items-start gap-2 rounded-2xl p-3 text-left ${c.id === active ? "bg-sand" : "hover:bg-cream"}`}>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${c.unread ? "font-bold text-brand" : "font-semibold text-brand"}`}>{c.other_name}</p>
                <p className="truncate text-xs text-muted-warm">{c.last_body ?? "No messages yet"}</p>
              </div>
              {c.unread > 0 && <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-primary-foreground">{c.unread}</span>}
            </button>
          </li>
        ))}
      </ul>
      {active && <Thread key={active} conversationId={active} userId={userId} title={list.find((c) => c.id === active)?.other_name ?? ""} />}
    </div>
  );
}

function Thread({ conversationId, userId, title }: { conversationId: string; userId: string; title: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["messages", conversationId];
  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id, sender_id, kind, body, created_at")
        .eq("conversation_id", conversationId).order("created_at").limit(500);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    void supabase.rpc("mark_conversation_read", { _conversation_id: conversationId }).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
    const ch = supabase.channel(`conv-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () => {
        void qc.invalidateQueries({ queryKey: key });
        void supabase.rpc("mark_conversation_read", { _conversation_id: conversationId }).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.data?.length]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim().slice(0, 4000);
      if (!body) return;
      const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, kind: "text", body });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: () => toast.error("Message not sent. Please try again."),
  });

  return (
    <section className={`${card} flex h-[560px] flex-col`} aria-label={`Conversation with ${title}`}>
      <header className="border-b border-sand-deep px-5 py-3 font-display text-lg font-semibold text-brand">{title}</header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.isLoading && <p className="text-sm text-muted-warm">Loading…</p>}
        {msgs.data?.length === 0 && <p className="text-center text-sm text-muted-warm">Say hello to start the conversation.</p>}
        {msgs.data?.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand text-primary-foreground" : "bg-cream text-ink ring-1 ring-sand-deep"}`}>
                {/* Only text is sent today; image/document messages are reserved for a later phase. */}
                <p className="whitespace-pre-wrap break-words">{m.kind === "text" ? m.body : "Attachment (not yet supported)"}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-warm"}`}>{time(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 border-t border-sand-deep p-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <label htmlFor="msg-input" className="sr-only">Message</label>
        <Textarea id="msg-input" rows={1} maxLength={4000} value={text} placeholder="Write a message…" className="min-h-10 resize-none"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); } }} />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Send" disabled={!text.trim() || send.isPending}><Send className="size-4" /></Button>
      </form>
    </section>
  );
}
