import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  PenLine,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetEmailThreadQueryKey,
  getListEmailThreadsQueryKey,
  useGetEmailThread,
  useListEmailThreads,
  useMarkEmailThreadRead,
  useSendEmail,
  type Email,
  type EmailThreadSummary,
  type SendEmailRequest,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const composeSchema = z.object({
  to: z.string().email('Enter a valid recipient email.'),
  subject: z.string().min(1, 'Add a subject.').max(998, 'Subject is too long.'),
  body: z.string().min(1, 'Write a message before sending.'),
});

type ComposeValues = z.infer<typeof composeSchema>;

function initials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

function displayName(address: string) {
  const match = address.match(/^([^<]+)</);
  return match?.[1]?.trim() || address.split('@')[0] || address;
}

function readableBody(email: Email) {
  if (email.bodyText) return email.bodyText;
  return (email.bodyHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return format(date, 'MMM d, yyyy · h:mm a');
}

function InboxSkeleton() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3 bg-card p-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="space-y-2 rounded-xl border border-border/60 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="hidden min-h-[520px] bg-card p-8 lg:block">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-12 h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function EmptyInbox({ search, onCompose }: { search: string; onCompose: () => void }) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center bg-card px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
        {search ? <Search className="h-7 w-7" /> : <InboxIcon className="h-7 w-7" />}
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {search ? 'No conversations match that search' : 'Your inbox is clear'}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {search
          ? 'Try a customer name, email address, or a phrase from the subject.'
          : 'New customer messages will appear here as soon as they arrive.'}
      </p>
      {!search && (
        <Button className="mt-6" onClick={onCompose} data-testid="button-empty-compose">
          <PenLine className="h-4 w-4" />
          Start a conversation
        </Button>
      )}
    </div>
  );
}

function ErrorInbox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card px-6 py-12 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <CircleAlert className="h-7 w-7" />
      </div>
      <h2 className="font-display text-xl font-semibold">Inbox unavailable</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        We could not load the conversation list. Your messages are safe; try the connection again.
      </p>
      <Button variant="outline" className="mt-6" onClick={onRetry} data-testid="button-retry-inbox">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

function ThreadRow({
  summary,
  active,
  onSelect,
}: {
  summary: EmailThreadSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const latest = summary.latestEmail;
  const sender = latest.direction === 'inbound' ? latest.fromAddress : latest.toAddress;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full border-b border-border/70 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-accent/45 ${
        active ? 'bg-accent/65' : 'bg-card'
      }`}
      data-testid={`button-thread-${summary.threadId}`}
    >
      {active && <span className="absolute inset-y-3 left-0 w-0.5 rounded-r bg-primary" />}
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
          summary.unreadCount > 0 ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {initials(sender)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`truncate text-sm ${summary.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground/85'}`}>
              {displayName(sender)}
            </p>
            <span className={`shrink-0 text-[11px] ${summary.unreadCount > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              {formatDistanceToNow(new Date(summary.lastActivityAt), { addSuffix: false })}
            </span>
          </div>
          <p className={`mt-1 truncate text-[13px] ${summary.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-foreground/75'}`}>
            {summary.subject || '(no subject)'}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs leading-5 text-muted-foreground">
              {readableBody(latest)}
            </p>
            {summary.messageCount > 1 && (
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {summary.messageCount}
              </span>
            )}
            {summary.unreadCount > 0 && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${summary.unreadCount} unread`} />
            )}
          </div>
        </div>
        <ChevronRight className={`mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${active ? 'text-primary' : ''}`} />
      </div>
    </button>
  );
}

function MessageBubble({ email }: { email: Email }) {
  const inbound = email.direction === 'inbound';
  const address = inbound ? email.fromAddress : email.toAddress;
  return (
    <article className={`flex gap-3 ${inbound ? '' : 'flex-row-reverse'}`} data-testid={`message-${email.id}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
        inbound ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
      }`}>
        {inbound ? initials(email.fromAddress) : 'FR'}
      </div>
      <div className={`max-w-[88%] min-w-0 ${inbound ? '' : 'text-right'}`}>
        <div className={`mb-2 flex items-baseline gap-2 ${inbound ? '' : 'justify-end'}`}>
          <p className="text-sm font-semibold text-foreground">{inbound ? displayName(email.fromAddress) : 'Flexi Route'}</p>
          <p className="text-[11px] text-muted-foreground">{dateLabel(email.createdAt)}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-left text-sm leading-7 shadow-sm ${
          inbound ? 'rounded-tl-sm border-border/70 bg-card' : 'rounded-tr-sm border-primary/20 bg-primary/10'
        }`}>
          <p className="whitespace-pre-wrap break-words text-foreground/90">{readableBody(email) || 'This message has no text content.'}</p>
        </div>
        <p className={`mt-1.5 text-[11px] text-muted-foreground ${inbound ? '' : 'text-right'}`}>{address}</p>
      </div>
    </article>
  );
}

function ThreadDetail({
  summary,
  thread,
  isLoading,
  isError,
  onRetry,
  onBack,
  onMarkRead,
  markingRead,
  onReply,
}: {
  summary?: EmailThreadSummary;
  thread?: { messages: Email[] };
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onBack: () => void;
  onMarkRead: () => void;
  markingRead: boolean;
  onReply: () => void;
}) {
  if (isLoading) {
    return (
      <div className="min-h-[520px] bg-card p-6 sm:p-8">
        <Button variant="ghost" size="sm" className="mb-8 lg:hidden" onClick={onBack} data-testid="button-back-inbox">
          <ArrowLeft className="h-4 w-4" /> Back to inbox
        </Button>
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-14 h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="ml-auto h-28 w-4/5 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }
  if (isError || !summary || !thread) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center bg-card px-6 text-center">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <h2 className="mt-4 font-display text-lg font-semibold">This thread could not be opened</h2>
        <p className="mt-2 text-sm text-muted-foreground">The conversation may have moved. Refresh and try again.</p>
        <Button variant="outline" className="mt-5" onClick={onRetry} data-testid="button-retry-thread">
          <RefreshCw className="h-4 w-4" /> Reload thread
        </Button>
      </div>
    );
  }

  const messages = thread.messages || [];
  const replyAddress = messages.find((message) => message.direction === 'inbound')?.fromAddress || summary.participants[0] || '';
  return (
    <section className="flex min-h-[520px] flex-col bg-background/55" data-testid="panel-thread-detail">
      <header className="border-b border-border/70 bg-card px-5 py-5 sm:px-8">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 lg:hidden" onClick={onBack} data-testid="button-back-inbox">
          <ArrowLeft className="h-4 w-4" /> Back to inbox
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              <span>Conversation</span>
              <span className="text-muted-foreground">/</span>
              <span>{summary.messageCount} {summary.messageCount === 1 ? 'message' : 'messages'}</span>
            </div>
            <h2 className="max-w-2xl font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {summary.subject || '(no subject)'}
            </h2>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {summary.participants.join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {summary.unreadCount > 0 ? (
              <Button variant="outline" size="sm" onClick={onMarkRead} disabled={markingRead} data-testid="button-mark-thread-read">
                {markingRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailOpen className="h-4 w-4" />}
                Mark read
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <CheckCheck className="h-3.5 w-3.5" /> Read
              </span>
            )}
            <Button size="sm" onClick={onReply} data-testid="button-reply-thread">
              <MessageSquare className="h-4 w-4" /> Reply
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Last activity {formatDistanceToNow(new Date(summary.lastActivityAt), { addSuffix: true })}
          <span className="text-border">|</span>
          Reply will go to {replyAddress}
        </div>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-7 sm:px-8">
        {messages.map((email) => <MessageBubble key={email.id} email={email} />)}
      </div>
      <footer className="border-t border-border/70 bg-card px-5 py-4 sm:px-8">
        <Button variant="outline" className="w-full justify-between" onClick={onReply} data-testid="button-reply-footer">
          <span className="flex items-center gap-2 text-muted-foreground"><PenLine className="h-4 w-4" /> Reply to this conversation</span>
          <span className="text-xs text-muted-foreground">R</span>
        </Button>
      </footer>
    </section>
  );
}

export default function Inbox() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);
  const params = useMemo(() => ({ limit: 100, ...(search ? { search } : {}) }), [search]);
  const listQuery = useListEmailThreads(params, {
    query: { queryKey: getListEmailThreadsQueryKey(params), refetchInterval: 30000 },
  });
  const threadQuery = useGetEmailThread(selectedThreadId || '', {
    query: {
      enabled: Boolean(selectedThreadId),
      queryKey: getGetEmailThreadQueryKey(selectedThreadId || ''),
    },
  });
  const markRead = useMarkEmailThreadRead();
  const sendEmail = useSendEmail();
  const composeForm = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', subject: '', body: '' },
  });

  const summaries = listQuery.data?.data ?? [];
  const selectedSummary = summaries.find((summary) => summary.threadId === selectedThreadId);

  useEffect(() => {
    if (!selectedThreadId && summaries[0]) setSelectedThreadId(summaries[0].threadId);
    if (selectedThreadId && summaries.length > 0 && !selectedSummary) setSelectedThreadId(summaries[0].threadId);
  }, [selectedThreadId, selectedSummary, summaries]);

  const unreadCount = summaries.reduce((count, summary) => count + summary.unreadCount, 0);

  const openReply = () => {
    const messages = threadQuery.data?.messages || [];
    const address = messages.find((message) => message.direction === 'inbound')?.fromAddress || selectedSummary?.participants[0] || '';
    const subject = selectedSummary?.subject || '';
    composeForm.reset({ to: address, subject: subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`, body: '' });
    setReplyOpen(true);
  };

  const openCompose = () => {
    composeForm.reset({ to: '', subject: '', body: '' });
    setReplyOpen(false);
    setSentNotice(false);
    setComposeOpen(true);
  };

  const onSend = (values: ComposeValues) => {
    const latest = threadQuery.data?.messages?.at(-1);
    const payload: SendEmailRequest = {
      to: values.to.trim(),
      subject: values.subject.trim(),
      body: values.body,
      ...(replyOpen && selectedThreadId ? { threadId: selectedThreadId } : {}),
      ...(replyOpen && latest?.messageId ? { inReplyTo: latest.messageId } : {}),
    };
    sendEmail.mutate({ data: payload }, {
      onSuccess: () => {
        setSentNotice(true);
        toast.success(replyOpen ? 'Reply sent' : 'Email sent', { description: `Delivered to ${values.to}` });
        if (selectedThreadId) {
          queryClient.invalidateQueries({ queryKey: getGetEmailThreadQueryKey(selectedThreadId) });
        }
        queryClient.invalidateQueries({ queryKey: getListEmailThreadsQueryKey(params) });
        window.setTimeout(() => {
          setComposeOpen(false);
          setReplyOpen(false);
          setSentNotice(false);
          composeForm.reset({ to: '', subject: '', body: '' });
        }, 900);
      },
      onError: () => toast.error('Message not sent', { description: 'Check the recipient and try again.' }),
    });
  };

  const handleMarkRead = () => {
    if (!selectedThreadId) return;
    markRead.mutate({ threadId: selectedThreadId }, {
      onSuccess: () => {
        queryClient.setQueryData(getListEmailThreadsQueryKey(params), (previous: typeof listQuery.data) => previous
          ? { ...previous, data: previous.data.map((summary) => summary.threadId === selectedThreadId ? { ...summary, unreadCount: 0 } : summary) }
          : previous);
        toast.success('Conversation marked as read');
      },
      onError: () => toast.error('Could not mark conversation as read'),
    });
  };

  return (
    <div className="min-h-[calc(100dvh-2rem)] space-y-5 pb-6 sm:space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Admin communications
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">Inbox</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Keep every customer conversation moving. Scan the queue, open the full thread, and answer from one trusted place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Resend connected
          </div>
          <Button onClick={openCompose} data-testid="button-compose-email">
            <PenLine className="h-4 w-4" /> Compose
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">All conversations</p>
          <p className="mt-1 font-display text-2xl font-semibold">{summaries.length}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Needs attention</p>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">{unreadCount}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card px-4 py-3 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Sync cadence</p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold"><Sparkles className="h-5 w-5 text-primary" /> 30s</p>
        </div>
      </div>

      {listQuery.isLoading ? <InboxSkeleton /> : listQuery.isError ? <ErrorInbox onRetry={() => listQuery.refetch()} /> : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-border/70 shadow-[0_10px_35px_-25px_rgba(37,43,54,0.45)]">
          <div className="grid items-stretch gap-px lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-h-[520px] bg-card">
              <div className="border-b border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">Conversation queue</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{unreadCount ? `${unreadCount} unread across the queue` : 'Nothing waiting on you'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching} title="Refresh inbox" data-testid="button-refresh-inbox">
                    <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') setSearch(searchInput.trim()); }}
                    placeholder="Search conversations"
                    className="h-10 border-border/80 bg-background pl-9 pr-9"
                    data-testid="input-search-inbox"
                  />
                  {searchInput && (
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => { setSearchInput(''); setSearch(''); }} data-testid="button-clear-search">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>{search ? `Results for “${search}”` : 'Recent'}</span>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </div>
              </div>
              {summaries.length === 0 ? <EmptyInbox search={search} onCompose={openCompose} /> : (
                <div className="max-h-[620px] overflow-y-auto">
                  {summaries.map((summary) => (
                    <ThreadRow
                      key={summary.threadId}
                      summary={summary}
                      active={summary.threadId === selectedThreadId}
                      onSelect={() => setSelectedThreadId(summary.threadId)}
                    />
                  ))}
                </div>
              )}
            </aside>
            {selectedThreadId ? (
              <ThreadDetail
                summary={selectedSummary}
                thread={threadQuery.data}
                isLoading={threadQuery.isLoading}
                isError={threadQuery.isError}
                onRetry={() => threadQuery.refetch()}
                onBack={() => setSelectedThreadId(null)}
                onMarkRead={handleMarkRead}
                markingRead={markRead.isPending}
                onReply={openReply}
              />
            ) : (
              <div className="hidden min-h-[520px] flex-col items-center justify-center bg-card px-6 text-center lg:flex">
                <Mail className="h-9 w-9 text-primary/60" />
                <h2 className="mt-4 font-display text-lg font-semibold">Select a conversation</h2>
                <p className="mt-2 text-sm text-muted-foreground">Choose a thread from the queue to read and respond.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={composeOpen || replyOpen} onOpenChange={(open) => { if (!sendEmail.isPending) { setComposeOpen(open); setReplyOpen(false); } }}>
        <DialogContent className="max-w-2xl border-border/80 bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><Send className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="font-display text-xl">{replyOpen ? 'Reply to conversation' : 'New email'}</DialogTitle>
                <DialogDescription className="mt-1">{replyOpen ? 'Your reply will be added to the selected thread.' : 'Send a direct message through the Flexi Route support address.'}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {sentNotice ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-7 w-7" /></div>
              <h3 className="mt-4 font-display text-xl font-semibold">Message sent</h3>
              <p className="mt-2 text-sm text-muted-foreground">The conversation has been updated.</p>
            </div>
          ) : (
            <Form {...composeForm}>
              <form onSubmit={composeForm.handleSubmit(onSend)} className="space-y-5 px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField control={composeForm.control} name="to" render={({ field }) => (
                    <FormItem><FormLabel>To</FormLabel><FormControl><Input {...field} type="email" placeholder="customer@example.com" data-testid="input-email-to" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={composeForm.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="Shipment question" data-testid="input-email-subject" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={composeForm.control} name="body" render={({ field }) => (
                  <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} className="min-h-[190px] resize-y bg-background/70 leading-7" placeholder="Write a clear, helpful response..." data-testid="textarea-email-body" /></FormControl><FormMessage /></FormItem>
                )} />
                {replyOpen && <p className="text-xs text-muted-foreground">Replying in thread {selectedThreadId}</p>}
                <DialogFooter className="gap-2 border-t border-border/70 pt-5">
                  <Button type="button" variant="ghost" onClick={() => { setComposeOpen(false); setReplyOpen(false); }} disabled={sendEmail.isPending} data-testid="button-cancel-email">Cancel</Button>
                  <Button type="submit" disabled={sendEmail.isPending} data-testid="button-send-email">
                    {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendEmail.isPending ? 'Sending…' : 'Send message'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}