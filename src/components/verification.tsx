import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DocType = Database["public"]["Enums"]["verification_document_type"];
type VStatus = Database["public"]["Enums"]["verification_status"];
const BUCKET = "verification-documents";
const card = "rounded-3xl bg-primary-foreground p-5 ring-1 ring-sand-deep sm:p-6";

export const docTypeLabels: Record<DocType, string> = {
  identity_document: "Identity document",
  professional_certificate: "Professional certificate",
  business_registration: "Business registration",
  professional_licence: "Professional licence",
};
// Stored values map to the product's status names.
export const statusLabels: Record<VStatus, string> = {
  unverified: "Not submitted", pending: "Pending", verified: "Approved", rejected: "Rejected",
};

function useDocuments(providerId: string | null) {
  return useQuery({
    queryKey: ["verification-docs", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("verification_documents").select("*")
        .eq("provider_id", providerId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

async function openDoc(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data) return toast.error("Couldn't open the document");
  window.open(data.signedUrl, "_blank", "noopener");
}

function DocList({ docs, onRemove }: { docs: Database["public"]["Tables"]["verification_documents"]["Row"][]; onRemove?: (d: { id: string; file_path: string }) => void }) {
  if (!docs.length) return <p className="text-sm text-muted-warm">No documents uploaded yet.</p>;
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand/50 p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand"><FileText className="size-4" />{docTypeLabels[d.document_type]}</p>
            <p className="truncate text-xs text-muted-warm">{d.file_name} · {new Date(d.created_at).toLocaleDateString()}</p>
            {d.notes && <p className="text-xs text-muted-warm">Note: {d.notes}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void openDoc(d.file_path)}>View</Button>
            {onRemove && <Button size="sm" variant="ghost" aria-label="Remove document" onClick={() => onRemove(d)}><Trash2 className="size-4" /></Button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProviderVerification({ provider }: { provider: { id: string; user_id: string; verification_status: VStatus } }) {
  const qc = useQueryClient();
  const docs = useDocuments(provider.id);
  const [type, setType] = useState<DocType>("identity_document");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const status = provider.verification_status;
  const locked = status === "pending" || status === "verified";

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first");
      if (file.size > 10 * 1024 * 1024) throw new Error("Files must be 10MB or smaller");
      if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) throw new Error("Use a PDF, JPG, PNG or WEBP file");
      const path = `${provider.user_id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("verification_documents").insert({
        provider_id: provider.id, document_type: type, file_path: path, file_name: file.name, notes: notes.trim() || null,
      });
      if (error) { await supabase.storage.from(BUCKET).remove([path]); throw error; }
    },
    onSuccess: () => { setFile(null); setNotes(""); toast.success("Document uploaded"); void qc.invalidateQueries({ queryKey: ["verification-docs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (d: { id: string; file_path: string }) => {
      const { error } = await supabase.from("verification_documents").delete().eq("id", d.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([d.file_path]);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["verification-docs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("provider_profiles").update({ verification_status: "pending" }).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submitted for review"); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const latestAdminNote = docs.data?.find((d) => d.admin_note)?.admin_note;
  const hasId = docs.data?.some((d) => d.document_type === "identity_document");

  return (
    <div className="space-y-5">
      <div className={card}>
        <p className="text-sm text-muted-warm">Verification status</p>
        <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-brand">
          {status === "verified" && <BadgeCheck className="size-6 text-accent-green" />}{statusLabels[status]}
        </p>
        <p className="mt-2 text-sm text-muted-warm">
          {status === "unverified" && "Upload at least an identity document, then submit for review. Approved professionals get a verified badge on their public profile."}
          {status === "pending" && "Our team is reviewing your documents. You'll get a notification when a decision is made."}
          {status === "verified" && "Your public profile shows the verified badge. Your documents stay private."}
          {status === "rejected" && "Your verification wasn't approved. Update your documents and submit again."}
        </p>
        {status === "rejected" && latestAdminNote && <p className="mt-2 rounded-2xl bg-sand/60 p-3 text-sm text-brand">Reviewer note: {latestAdminNote}</p>}
        <p className="mt-3 text-xs text-muted-warm">Documents are stored privately and only seen by you and SERVICONNECT administrators.</p>
      </div>

      {!locked && (
        <div className={`${card} space-y-3`}>
          <h2 className="font-display text-xl font-semibold text-brand">Upload a document</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="doc-type">Document type</Label>
              <select id="doc-type" value={type} onChange={(e) => setType(e.target.value as DocType)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(docTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-file">File (PDF or image, max 10MB)</Label>
              <input id="doc-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-notes">Notes (optional)</Label>
            <Textarea id="doc-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Certificate number, issuing body" />
          </div>
          <Button variant="terracotta" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            <Upload className="size-4" />{upload.isPending ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      )}

      <div className={`${card} space-y-3`}>
        <h2 className="font-display text-xl font-semibold text-brand">Your documents</h2>
        {docs.isLoading ? <p className="text-sm text-muted-warm">Loading…</p> : <DocList docs={docs.data ?? []} onRemove={locked ? undefined : (d) => remove.mutate(d)} />}
        {!locked && (
          <Button variant="terracotta" disabled={!hasId || submit.isPending} onClick={() => submit.mutate()}>Submit for verification</Button>
        )}
        {!locked && !hasId && <p className="text-xs text-muted-warm">An identity document is required before submitting.</p>}
      </div>
    </div>
  );
}

type AdminProvider = { id: string; business_name: string | null; public_name: string | null; profession: string | null; verification_status: VStatus };

export function AdminVerificationReview({ provider }: { provider: AdminProvider }) {
  const qc = useQueryClient();
  const docs = useDocuments(provider.id);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: async (approve: boolean) => {
      const { error } = await supabase.from("provider_profiles")
        .update({ verification_status: approve ? "verified" : "rejected", is_verified: approve }).eq("id", provider.id);
      if (error) throw error;
      if (note.trim() && docs.data?.length) {
        const r = await supabase.from("verification_documents").update({ admin_note: note.trim() }).eq("provider_id", provider.id);
        if (r.error) throw r.error;
      }
    },
    onSuccess: (_d, approve) => { setNote(""); toast.success(approve ? "Provider approved" : "Provider rejected"); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = provider.verification_status;
  return (
    <div className={`${card} space-y-3`}>
      <div>
        <p className="font-display text-lg font-semibold text-brand">{provider.business_name || provider.public_name || "Unnamed provider"}</p>
        <p className="text-sm text-muted-warm">{provider.profession ?? "—"} · Status: <span className="font-semibold">{statusLabels[s]}</span></p>
      </div>
      {docs.isLoading ? <p className="text-sm text-muted-warm">Loading documents…</p> : <DocList docs={docs.data ?? []} />}
      <Textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the provider (optional, shown if rejected)" />
      <div className="flex gap-2">
        <Button size="sm" variant="terracotta" disabled={decide.isPending || s === "verified" || !docs.data?.length} onClick={() => decide.mutate(true)}>Approve</Button>
        <Button size="sm" variant="outline" disabled={decide.isPending || s === "rejected"} onClick={() => decide.mutate(false)}>Reject</Button>
      </div>
    </div>
  );
}
