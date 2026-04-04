import { create } from 'zustand';
import * as fmApi from '../api/client';

/**
 * Inbox Store — conversations, messages, chat selection, realtime.
 * Fetches from API, no localStorage for message data.
 */
export const useInboxStore = create((set, get) => ({
  // ── State ──
  msgs: {},              // { clinicId: [conversations] }
  selChat: null,
  newMsg: '',
  inboxFilter: 'open',   // open | needs_action | ai_handling | resolved | all
  msgPageSize: 50,
  msgPage: {},
  loading: false,
  error: null,

  // ── Actions ──
  setMsgs: (msgs) => set(typeof msgs === 'function' ? (s) => ({ msgs: msgs(s.msgs) }) : { msgs }),
  setSelChat: (selChat) => set({ selChat }),
  setNewMsg: (newMsg) => set({ newMsg }),
  setInboxFilter: (inboxFilter) => set({ inboxFilter }),
  setMsgPage: (msgPage) => set(typeof msgPage === 'function' ? (s) => ({ msgPage: msgPage(s.msgPage) }) : { msgPage }),

  /**
   * Fetch conversations from API.
   */
  fetchConversations: async (clinicId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fmApi.getConversations(params);
      const conversations = data.conversations || data;
      set((s) => {
        const existing = s.msgs[clinicId] || [];
        // Preserve loaded messages when refreshing conversation list
        const merged = conversations.map(conv => {
          const prev = existing.find(e => e.id === conv.id || e.patientId === conv.patientId);
          if (prev?.msgs || prev?._msgsLoaded) {
            return { ...conv, msgs: prev.msgs, _msgsLoaded: prev._msgsLoaded };
          }
          return conv;
        });
        // Keep demo/local-only conversations not returned by API
        const apiIds = new Set(conversations.map(c => c.id));
        const kept = existing.filter(e => e.is_demo && !apiIds.has(e.id));
        // Also keep selChat in sync so Fallübersicht gets fresh extractedFields without reload
        const sc = s.selChat;
        const updatedSc = sc ? merged.find(j => j.id === sc.id || j.patientId === sc.patientId) || sc : sc;
        return { msgs: { ...s.msgs, [clinicId]: [...merged, ...kept] }, loading: false, selChat: updatedSc };
      });
      return conversations;
    } catch (err) {
      set({ error: err.message, loading: false });
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to load conversations", type: "error" } }));
      return null;
    }
  },

  /**
   * Fetch messages for a specific conversation.
   */
  fetchMessages: async (conversationId, params = {}) => {
    try {
      return await fmApi.getMessages(conversationId, params);
    } catch (err) {
      set({ error: err.message });
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to load messages", type: "error" } }));
      return null;
    }
  },

  /**
   * Send a message in a conversation.
   */
  sendMessage: (chatId, clinicId, text, userName) => {
    if (!text.trim() || !clinicId) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Optimistic UI update
    set((s) => {
      const clinicMsgs = [...(s.msgs[clinicId] || [])];
      const idx = clinicMsgs.findIndex((c) => c.id === chatId);
      if (idx === -1) return s;
      const chat = { ...clinicMsgs[idx] };
      chat.msgs = [...(chat.msgs || []), { text: text.trim(), time: timeStr, sender: 'staff' }];
      chat.unread = false;
      clinicMsgs[idx] = chat;
      return { msgs: { ...s.msgs, [clinicId]: clinicMsgs }, newMsg: '' };
    });

    // API call (non-blocking)
    const chat = (get().msgs[clinicId] || []).find((c) => c.id === chatId);
    if (chat) {
      fmApi.sendCrmMessage(chatId, { text: text.trim(), sender: 'staff' }).catch(e => { console.error("[store] API sync failed:", e.message || e); window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to send message", type: "error" } })); });
    }
  },

  /**
   * Mark conversation as resolved.
   */
  markResolved: (chatId, clinicId) => {
    if (!clinicId) return;
    set((s) => {
      const clinicMsgs = [...(s.msgs[clinicId] || [])];
      const idx = clinicMsgs.findIndex((c) => c.id === chatId);
      if (idx > -1) {
        const chat = { ...clinicMsgs[idx] };
        chat.msgs = [...(chat.msgs || []), {
          text: '✓ Conversation resolved',
          time: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }),
          sender: 'system',
        }];
        chat.unread = false;
        clinicMsgs[idx] = chat;
      }
      return { msgs: { ...s.msgs, [clinicId]: clinicMsgs } };
    });
  },

  // ── Computed helpers ──

  getAllClinicMsgs: (clinicId) => get().msgs[clinicId] || [],

  getUnreadCount: (clinicId) => (get().msgs[clinicId] || []).filter((m) => m.unread).length,

  getFilteredMsgs: (clinicId, filter, getConvStatus) => {
    const allMsgs = get().msgs[clinicId] || [];
    return allMsgs.filter((m) => {
      const cs = getConvStatus(m);
      if (filter === 'all') return true;
      if (filter === 'resolved') return cs === 'resolved' || cs === 'closed';
      if (filter === 'needs_action') {
        return ['needs_medical_review', 'waiting_for_clinic_reply', 'booking_pending', 'human_takeover'].includes(cs);
      }
      if (filter === 'ai_handling') return cs === 'ai_active' || cs === 'collecting_photos';
      return cs !== 'resolved' && cs !== 'closed';
    });
  },
}));
