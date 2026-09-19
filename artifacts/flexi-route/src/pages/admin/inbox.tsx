import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  Paperclip,
  PenLine,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getGetInboxThreadQueryKey,
  getListInboxThreadsQueryKey,
  useGetInboxThread,
  useListInboxThreads,
  useMarkInboxThreadRead,
  useSendInboxEmail,
  type InboxEmail,
  type InboxThread,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const composeSchema = z.object({
  to: z.string().email("Enter a valid recipient email."),
  subject: z.string().trim().min(1, "Add a subject."),
  textBody: z.string().min(1, "Write a message before sending."),
});

type ComposeValues = z.infer<typeof composeSchema>;

function initials(address: string): string {
  return address
    .replace(/[<>]/g, " ")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function displayName(address: string): string {
  const match = address.match(/^([^<]+)</);
  return match?.[1]?.trim() || address.split("@")[0] || address;
}

function readableBody(email: Pick<InboxEmail, "textBody" | "htmlBody">): string {
  if (email.textBody) return email.textBody;
  return (email.htmlBody ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function relativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function fullDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

function ThreadRow({ thread, active, onSelect }: { thread: InboxThread; active: boolean; onSelect: () => void }) {
  const sender = thread.participants[0] ?? "Unknown sender";
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`button-inbox-thread-${thread.threadId}`}
      className={`group relative w-full border-b border-border/70 px-4 py-4 text-left transition-colors hover:bg-primary/5 ${active ? "bg-primary/10" : "bg-card"}`}
    >
      {active && <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-primary" />}
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${thread.unreadCount ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
          {initials(sender)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`truncate text-sm ${thread.unreadCount ? "font-bold" : "font-semibold text-foreground/80"}`}>{displayName(sender)}</p>
            <span className={`shrink-0 text-[11px] ${thread.unreadCount ? "font-bold text-primary" : "text-muted-foreground"}`}>{relativeDate(thread.latestMessageAt)}</span>
          </div>
          <p className={`mt-1 truncate text-[13px] ${thread.unreadCount ? "font-semibold" : "text-foreground/75"}`}>{thread.subject || "(no subject)"}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{thread.preview || "No preview available"}</p>
            {thread.messageCount > 1 && <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"><MessageSquare className="h-3 w-3" />{thread.messageCount}</span>}
            {thread.unreadCount > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${thread.unreadCount} unread`} />}
          </div>
        </div>
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function MessageBubble({ email }: { email: InboxEmail }) {
  const inbound = email.direction === "inbound";
  return (
    <article className={`flex gap-3 ${inbound ? "" : "flex-row-reverse"}`} data-testid={`message-inbox-${email.id}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${inbound ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
        {inbound ? initials(email.fromAddress) : "FR"}
      </div>
      <div className={`max-w-[88%] min-w-0 ${inbound ? "" : "text-right"}`}>
        <div className={`mb-2 flex items-baseline gap-2 ${inbound ? "" : "justify-end"}`}>
          <p className="text-sm font-semibold">{inbound ? displayName(email.fromAddress) : "Flexi Route"}</p>
          <p className="text-[11px] text-muted-foreground" title={fullDate(email.receivedAt)}>{relativeDate(email.receivedAt)}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-left text-sm leading-7 shadow-sm ${inbound ? "rounded-tl-sm bg-card" : "rounded-tr-sm border-primary/20 bg-primary/10"}`}>
          <p className="whitespace-pre-wrap break-words text-foreground/90">{readableBody(email) || "This message has no text content."}</p>
          {email.attachments.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/70 pt-3">
              <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Paperclip className="h-3.5 w-3.5" />{email.attachments.length} attachment{email.attachments.length === 1 ? "" : "s"}</p>
              {email.attachments.map((attachment, index) => attachment.downloadUrl ? (
                <a key={`${attachment.filename}-${index}`} href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-primary underline-offset-4 hover:underline" data-testid={`link-inbox-attachment-${email.id}-${index}`}>{attachment.filename}</a>
              ) : (
                <p key={`${attachment.filename}-${index}`} className="truncate text-xs text-muted-foreground">{attachment.filename}</p>
              ))}
            </div>
          )}
        </div>
        <p className={`mt-1.5 text-[11px] text-muted-foreground ${inbound ? "" : "text-right"}`}>{inbound ? email.fromAddress : email.toAddress}</p>
      </div>
    </article>
  );
}

export default function Inbox() {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const params = { limit: 100 };
  const listQuery = useListInboxThreads(params, { query: { queryKey: getListInboxThreadsQueryKey(params), refetchInterval: 30000 } });
  const threadQuery = useGetInboxThread(selectedThreadId ?? "", { query: { enabled: Boolean(selectedThreadId), queryKey: getGetInboxThreadQueryKey(selectedThreadId ?? "") } });
  const markRead = useMarkInboxThreadRead();
  const sendEmail = useSendInboxEmail();
  const form = useForm<ComposeValues>({ resolver: zodResolver(composeSchema), defaultValues: { to: "", subject: "", textBody: "" } });
  const threads = listQuery.data ?? [];
  const filteredThreads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) => `${thread.subject} ${thread.preview} ${thread.participants.join(" ")}`.toLowerCase().includes(needle));
  }, [search, threads]);
  const selectedSummary = threads.find((thread) => thread.threadId === selectedThreadId);
  const messages = threadQuery.data?.messages ?? [];
  const unreadCount = threads.reduce((count, thread) => count + thread.unreadCount, 0);

  useEffect(() => {
    if (!selectedThreadId && filteredThreads[0]) setSelectedThreadId(filteredThreads[0].threadId);
  }, [filteredThreads, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId || !selectedSummary?.unreadCount) return;
    markRead.mutate({ threadId: selectedThreadId }, {
      onSuccess: () => {
        queryClient.setQueryData(getListInboxThreadsQueryKey(params), (previous: InboxThread[] | undefined) => previous?.map((thread) => thread.threadId === selectedThreadId ? { ...thread, unreadCount: 0 } : thread));
      },
    });
  // Mark only when a different thread is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  function openCompose() {
    setReplyOpen(false);
    setSent(false);
    form.reset({ to: "", subject: "", textBody: "" });
    setComposeOpen(true);
  }

  function openReply() {
    const inbound = messages.find((message) => message.direction === "inbound");
    const latest = messages.at(-1);
    const subject = selectedSummary?.subject ?? "";
    form.reset({ to: inbound?.fromAddress ?? "", subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`, textBody: "" });
    setReplyOpen(true);
    setComposeOpen(false);
    if (!latest?.messageId) toast.info("This thread has no message ID; the reply will still stay in the selected thread.");
  }

  function submit(values: ComposeValues) {
    const latest = messages.at(-1);
    sendEmail.mutate({
      data: {
        to: values.to.trim(),
        subject: values.subject.trim(),
        textBody: values.textBody,
        ...(replyOpen && selectedThreadId ? { threadId: selectedThreadId } : {}),
        ...(replyOpen && latest?.messageId ? { inReplyTo: latest.messageId } : {}),
      },
    }, {
      onSuccess: () => {
        setSent(true);
        toast.success(replyOpen ? "Reply sent" : "Email sent");
        if (selectedThreadId) queryClient.invalidateQueries({ queryKey: getGetInboxThreadQueryKey(selectedThreadId) });
        queryClient.invalidateQueries({ queryKey: getListInboxThreadsQueryKey(params) });
        window.setTimeout(() => {
          setComposeOpen(false);
          setReplyOpen(false);
          setSent(false);
          form.reset({ to: "", subject: "", textBody: "" });
        }, 900);
      },
      onError: () => toast.error("Message not sent", { description: "Resend could not deliver this message." }),
    });
  }

  return (
    <div className="min-h-[calc(100dvh-2rem)] space-y-5 pb-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary"><ShieldCheck className="h-4 w-4" />Admin communications</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Inbox</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Keep customer conversations moving from one trusted place.</p>
        </div>
        <Button onClick={openCompose} data-testid="button-compose-inbox-email"><PenLine className="h-4 w-4" />Compose</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Conversations</p><p className="mt-1 text-2xl font-semibold">{threads.length}</p></div>
        <div className="rounded-2xl border bg-card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Needs attention</p><p className="mt-1 text-2xl font-semibold text-primary">{unreadCount}</p></div>
        <div className="rounded-2xl border bg-card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Provider</p><p className="mt-1 flex items-center gap-2 text-2xl font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Resend</p></div>
      </div>

      {listQuery.isLoading ? (
        <div className="grid min-h-[520px] gap-px rounded-2xl border bg-border/60 lg:grid-cols-[340px_1fr]"><div className="space-y-4 bg-card p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div><div className="hidden bg-card lg:block" /></div>
      ) : listQuery.isError ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border bg-card text-center"><CircleAlert className="h-8 w-8 text-destructive" /><h2 className="mt-4 text-lg font-semibold">Inbox unavailable</h2><p className="mt-2 text-sm text-muted-foreground">Try the connection again.</p><Button variant="outline" className="mt-5" onClick={() => listQuery.refetch()} data-testid="button-retry-inbox"><RefreshCw className="h-4 w-4" />Try again</Button></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-border/60">
          <div className="grid gap-px lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-h-[520px] bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Conversation queue</p><p className="mt-1 text-xs text-muted-foreground">{unreadCount ? `${unreadCount} unread` : "Nothing waiting on you"}</p></div><Button variant="ghost" size="icon" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching} title="Refresh inbox" data-testid="button-refresh-inbox"><RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? "animate-spin" : ""}`} /></Button></div>
                <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="pl-9 pr-9" data-testid="input-search-inbox" />{search && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" onClick={() => setSearch("")} data-testid="button-clear-inbox-search"><X className="h-4 w-4" /></button>}</div>
              </div>
              {filteredThreads.length ? <div className="max-h-[620px] overflow-y-auto">{filteredThreads.map((thread) => <ThreadRow key={thread.threadId} thread={thread} active={thread.threadId === selectedThreadId} onSelect={() => setSelectedThreadId(thread.threadId)} />)}</div> : <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center"><InboxIcon className="h-9 w-9 text-primary/60" /><h2 className="mt-4 font-semibold">{search ? "No matching conversations" : "Your inbox is clear"}</h2><p className="mt-2 text-sm text-muted-foreground">{search ? "Try another search." : "New customer messages will appear here."}</p></div>}
            </aside>

            {selectedThreadId && selectedSummary ? (
              <section className="flex min-h-[520px] flex-col bg-background/50" data-testid="panel-inbox-thread">
                <header className="border-b bg-card px-5 py-5 sm:px-8">
                  <Button variant="ghost" size="sm" className="mb-3 lg:hidden" onClick={() => setSelectedThreadId(null)} data-testid="button-back-inbox"><ArrowLeft className="h-4 w-4" />Back</Button>
                  <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Conversation · {selectedSummary.messageCount} message{selectedSummary.messageCount === 1 ? "" : "s"}</p><h2 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{selectedSummary.subject || "(no subject)"}</h2><p className="mt-2 truncate text-sm text-muted-foreground">{selectedSummary.participants.join(" · ")}</p></div><div className="flex items-center gap-2">{selectedSummary.unreadCount > 0 ? <Button variant="outline" size="sm" onClick={() => markRead.mutate({ threadId: selectedThreadId })} disabled={markRead.isPending} data-testid="button-mark-inbox-thread-read">{markRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailOpen className="h-4 w-4" />}Mark read</Button> : <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Check className="h-3.5 w-3.5" />Read</span>}<Button size="sm" onClick={openReply} data-testid="button-reply-inbox-thread"><MessageSquare className="h-4 w-4" />Reply</Button></div></div>
                  <p className="mt-4 text-xs text-muted-foreground">Last activity {fullDate(selectedSummary.latestMessageAt)}</p>
                </header>
                {threadQuery.isLoading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : threadQuery.isError ? <div className="flex flex-1 flex-col items-center justify-center text-center"><CircleAlert className="h-8 w-8 text-destructive" /><p className="mt-3 text-sm">This conversation could not be opened.</p><Button variant="outline" className="mt-4" onClick={() => threadQuery.refetch()} data-testid="button-retry-inbox-thread">Reload</Button></div> : <div className="flex-1 space-y-6 overflow-y-auto px-5 py-7 sm:px-8">{messages.map((email) => <MessageBubble key={email.id} email={email} />)}</div>}
                <footer className="border-t bg-card px-5 py-4 sm:px-8"><Button variant="outline" className="w-full justify-start gap-2" onClick={openReply} data-testid="button-reply-inbox-footer"><PenLine className="h-4 w-4" />Reply to this conversation</Button></footer>
              </section>
            ) : <div className="hidden min-h-[520px] flex-col items-center justify-center bg-card text-center lg:flex"><Mail className="h-9 w-9 text-primary/60" /><h2 className="mt-4 font-semibold">Select a conversation</h2><p className="mt-2 text-sm text-muted-foreground">Choose a thread to read and respond.</p></div>}
          </div>
        </div>
      )}

      <Dialog open={composeOpen || replyOpen} onOpenChange={(open) => { if (!sendEmail.isPending) { setComposeOpen(open); setReplyOpen(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{replyOpen ? "Reply to conversation" : "New email"}</DialogTitle><DialogDescription>{replyOpen ? "Your reply will be added to the selected thread." : "Send a message through the Flexi Route support address."}</DialogDescription></DialogHeader>
          {sent ? <div className="flex flex-col items-center justify-center py-12 text-center"><Check className="h-12 w-12 rounded-full bg-emerald-100 p-2 text-emerald-700" /><h3 className="mt-4 text-xl font-semibold">Message sent</h3><p className="mt-2 text-sm text-muted-foreground">The conversation has been updated.</p></div> : <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
            <FormField control={form.control} name="to" render={({ field }) => <FormItem><FormLabel>To</FormLabel><FormControl><Input {...field} type="email" placeholder="customer@example.com" data-testid="input-inbox-email-to" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="subject" render={({ field }) => <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="Shipment question" data-testid="input-inbox-email-subject" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="textBody" render={({ field }) => <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} className="min-h-[180px] resize-y" placeholder="Write a clear, helpful response..." data-testid="textarea-inbox-email-body" /></FormControl><FormMessage /></FormItem>} />
            {replyOpen && <p className="text-xs text-muted-foreground">Replying in thread {selectedThreadId}</p>}
            <DialogFooter><Button type="button" variant="ghost" onClick={() => { setComposeOpen(false); setReplyOpen(false); }} disabled={sendEmail.isPending} data-testid="button-cancel-inbox-email">Cancel</Button><Button type="submit" disabled={sendEmail.isPending} data-testid="button-send-inbox-email">{sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sendEmail.isPending ? "Sending..." : "Send message"}</Button></DialogFooter>
          </form></Form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}