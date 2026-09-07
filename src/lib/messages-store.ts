export interface StoredConversation {
  _id: string;
  participants: string[];
  participantNames: string[];
  participantRoles?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId: string;
  unreadCount?: number;
}

export interface StoredMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_CONVOS_KEY = "vtp_messages_conversations_v1";
const STORAGE_MESSAGES_KEY = "vtp_messages_items_v1";
export const MESSAGES_CHANGE_EVENT = "vtp_messages_change";

function notifyMessagesChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESSAGES_CHANGE_EVENT));
  }
}

const INITIAL_CONVERSATIONS: StoredConversation[] = [];

const INITIAL_MESSAGES: StoredMessage[] = [];

export function getLocalConversations(userId?: string): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CONVOS_KEY);
    const convos: StoredConversation[] = raw ? JSON.parse(raw) : [];
    if (userId) {
      return convos.filter((c) => c.participants && c.participants.includes(userId));
    }
    return convos;
  } catch {
    return [];
  }
}

export function saveLocalConversations(convos: StoredConversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CONVOS_KEY, JSON.stringify(convos));
    notifyMessagesChange();
  } catch (err) {
    console.warn("Failed to save local conversations:", err);
  }
}

export function getLocalMessages(conversationId: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    const messages: StoredMessage[] = raw ? JSON.parse(raw) : [];
    return messages.filter((m) => m.conversationId === conversationId);
  } catch {
    return [];
  }
}

export function saveLocalMessages(messages: StoredMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    notifyMessagesChange();
  } catch (err) {
    console.warn("Failed to save local messages:", err);
  }
}

export function createOrGetLocalConversation(
  currentUser: { _id?: string; name?: string; role?: string },
  participant: { userId: string; name: string; role?: string; avatarUrl?: string }
): StoredConversation {
  const currentUserId = currentUser?._id || "current_user";
  const currentUserName = currentUser?.name || "You";
  const convos = getLocalConversations();

  const existing = convos.find(
    (c) =>
      c.participants.includes(currentUserId) &&
      c.participants.includes(participant.userId)
  );

  if (existing) {
    return existing;
  }

  const newConv: StoredConversation = {
    _id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    participants: [currentUserId, participant.userId],
    participantNames: [currentUserName, participant.name],
    participantRoles: {
      [currentUserId]: currentUser.role || "student",
      [participant.userId]: participant.role || "teacher",
    },
    participantAvatars: participant.avatarUrl
      ? { [participant.userId]: participant.avatarUrl }
      : undefined,
    lastMessage: "Conversation started.",
    lastMessageAt: Date.now(),
    lastSenderId: currentUserId,
    unreadCount: 0,
  };

  const updated = [newConv, ...convos];
  saveLocalConversations(updated);
  return newConv;
}

export function sendLocalMessage(
  conversationId: string,
  sender: { _id?: string; name?: string },
  text: string
): StoredMessage {
  const senderId = sender._id || "current_user";
  const senderName = sender.name || "You";
  const cleanText = text.trim();

  const allMessagesRaw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_MESSAGES_KEY) : null;
  let allMessages: StoredMessage[] = allMessagesRaw ? JSON.parse(allMessagesRaw) : INITIAL_MESSAGES;

  const newMsg: StoredMessage = {
    _id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversationId,
    senderId,
    senderName,
    text: cleanText,
    timestamp: Date.now(),
    read: true,
  };

  allMessages = [...allMessages, newMsg];
  saveLocalMessages(allMessages);

  // Update conversation's lastMessage
  const convos = getLocalConversations();
  const updatedConvos = convos.map((c) => {
    if (c._id === conversationId) {
      return {
        ...c,
        lastMessage: cleanText,
        lastMessageAt: Date.now(),
        lastSenderId: senderId,
      };
    }
    return c;
  });
  saveLocalConversations(updatedConvos);

  return newMsg;
}
