import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Send, MessageSquare, Loader2, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

interface Message {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface Props {
  /** Used by parents to authenticate against the function */
  bForm?: string;
  dob?: string;
  /** Used by school staff with direct applicant id (authenticated path) */
  applicantId?: string;
  /** "applicant" (parent view) or "school" (admin/staff view) */
  asSender: 'applicant' | 'school';
  className?: string;
  emptyHint?: string;
}

export function AdmissionChat({ bForm, dob, applicantId, asSender, className, emptyHint }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (asSender === 'applicant') {
      if (!bForm || !dob) return;
      const { data, error } = await supabase.rpc('list_admission_messages', {
        _b_form_number: bForm.trim(),
        _date_of_birth: dob,
      });
      if (error) {
        toast({ title: 'Could not load chat', description: getErrorMessage(error), variant: 'destructive' });
      }
      setMessages((data as Message[]) || []);
    } else {
      if (!applicantId) return;
      const { data, error } = await supabase
        .from('admission_messages')
        .select('id, sender_type, content, created_at')
        .eq('applicant_id', applicantId)
        .order('created_at', { ascending: true });
      if (error) toast({ title: 'Could not load chat', description: getErrorMessage(error), variant: 'destructive' });
      setMessages((data as Message[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bForm, dob, applicantId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`admission-msgs-${applicantId || bForm || 'anon'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admission_messages' }, (payload) => {
        const m = payload.new as any;
        // Filter to this applicant
        if (applicantId && m.applicant_id !== applicantId) return;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [applicantId, bForm]);

  // For applicant flow we don't have applicantId locally; refetch on realtime trigger via interval fallback
  useEffect(() => {
    if (asSender !== 'applicant') return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bForm, dob]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    if (asSender === 'applicant') {
      const { error } = await supabase.rpc('post_admission_message', {
        _b_form_number: bForm!.trim(),
        _date_of_birth: dob!,
        _content: text,
      });
      if (error) {
        toast({ title: 'Send failed', description: getErrorMessage(error), variant: 'destructive' });
      } else {
        setInput('');
        await load();
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('admission_messages').insert({
        applicant_id: applicantId!,
        sender_type: 'school',
        sender_user_id: user?.id,
        content: text,
      });
      if (error) {
        toast({ title: 'Send failed', description: getErrorMessage(error), variant: 'destructive' });
      } else {
        setInput('');
      }
    }
    setSending(false);
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0 border border-border rounded-lg bg-background/40', className)}>
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
        <div ref={scrollRef} className="p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{emptyHint || 'No messages yet. Start the conversation.'}</p>
            </div>
          ) : (
            messages.map(m => {
              const mine = m.sender_type === asSender;
              const Icon = m.sender_type === 'school' ? Building2 : User;
              return (
                <div key={m.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    m.sender_type === 'school' ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn('text-[10px] mt-1 font-mono', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {format(new Date(m.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-2 flex gap-2 items-end">
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={asSender === 'applicant' ? 'Message the school...' : 'Reply to applicant...'}
          maxLength={2000}
          className="min-h-[40px] resize-none"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} size="icon">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
