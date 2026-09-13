import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AssistantType = 'admin' | 'teacher' | 'student';

export interface AIConversation {
  id: string;
  title: string;
  assistant_type: AssistantType;
  updated_at: string;
}

export interface AIMessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

/** Multi-conversation persistence layer for AI chats. */
export function useAIChats(assistantType: AssistantType) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id,title,assistant_type,updated_at')
      .eq('user_id', user.id)
      .eq('assistant_type', assistantType)
      .order('updated_at', { ascending: false })
      .limit(50);
    setConversations((data ?? []) as AIConversation[]);
  }, [user, assistantType]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as AIMessageRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  const createConversation = useCallback(async (title = 'New chat') => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, assistant_type: assistantType, title })
      .select('id,title,assistant_type,updated_at')
      .single();
    if (error || !data) return null;
    setConversations((prev) => [data as AIConversation, ...prev]);
    setActiveId(data.id);
    return data.id;
  }, [user, assistantType]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    await supabase.from('ai_conversations').update({ title }).eq('id', id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  /** Auto-rename if conversation still has the default "New chat" title. */
  const autoRenameIfDefault = useCallback(async (id: string, fromUserMessage: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv || (conv.title && conv.title !== 'New chat')) return;
    // Strip markdown/punctuation, take first ~6 words, max 60 chars
    const clean = fromUserMessage
      .replace(/[`*_#>\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const words = clean.split(' ').slice(0, 8).join(' ');
    const title = (words.length > 60 ? words.slice(0, 57) + '…' : words) || 'New chat';
    if (title === 'New chat') return;
    await supabase.from('ai_conversations').update({ title }).eq('id', id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, [conversations]);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from('ai_conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const appendMessage = useCallback(async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    const { data } = await supabase
      .from('ai_messages')
      .insert([{ conversation_id: conversationId, role, content, metadata: (metadata ?? null) as never }])
      .select('*')
      .single();
    if (data) setMessages((prev) => [...prev, data as AIMessageRow]);
    return data as AIMessageRow | null;
  }, []);

  /** Optimistic local append (used during streaming before DB persist). */
  const setLocalMessages = setMessages;

  return {
    conversations,
    activeId,
    setActiveId,
    messages,
    loading,
    createConversation,
    renameConversation,
    autoRenameIfDefault,
    deleteConversation,
    appendMessage,
    setLocalMessages,
    refresh: loadConversations,
  };
}
