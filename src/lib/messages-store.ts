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

const INITIAL_CONVERSATIONS: StoredConversation[] = [
  {
    _id: "conv_sarah_alex",
    participants: ["demo_student_01", "teacher_usr_01"],
    participantNames: ["Alex Rivera", "Dr. Sarah Jenkins"],
    participantRoles: {
      demo_student_01: "student",
      teacher_usr_01: "teacher",
    },
    participantAvatars: {
      teacher_usr_01: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
    lastMessage: "Looking forward to our AP Calculus lesson tomorrow! Please review derivatives sheet #4.",
    lastMessageAt: Date.now() - 15 * 60 * 1000,
    lastSenderId: "teacher_usr_01",
    unreadCount: 1,
  },
  {
    _id: "conv_marcus_alex",
    participants: ["demo_student_01", "teacher_usr_02"],
    participantNames: ["Alex Rivera", "Marcus Chen"],
    participantRoles: {
      demo_student_01: "student",
      teacher_usr_02: "teacher",
    },
    participantAvatars: {
      teacher_usr_02: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    lastMessage: "Great job on the quantum mechanics problem set. All solutions verified.",
    lastMessageAt: Date.now() - 2 * 3600 * 1000,
    lastSenderId: "teacher_usr_02",
    unreadCount: 0,
  },
];

const INITIAL_MESSAGES: StoredMessage[] = [
  {
    _id: "msg_1",
    conversationId: "conv_sarah_alex",
    senderId: "demo_student_01",
    senderName: "Alex Rivera",
    text: "Hi Dr. Jenkins, I had a quick question regarding problem #3 on optimization in Calculus.",
    timestamp: Date.now() - 40 * 60 * 1000,
    read: true,
  },
  {
    _id: "msg_2",
    conversationId: "conv_sarah_alex",
    senderId: "teacher_usr_01",
    senderName: "Dr. Sarah Jenkins",
    text: "Hello Alex! For problem #3, start by setting the first derivative equal to zero to locate critical points.",
    timestamp: Date.now() - 25 * 60 * 1000,
    read: true,
  },
  {
    _id: "msg_3",
    conversationId: "conv_sarah_alex",
    senderId: "teacher_usr_01",
    senderName: "Dr. Sarah Jenkins",
    text: "Looking forward to our AP Calculus lesson tomorrow! Please review derivatives sheet #4.",
    timestamp: Date.now() - 15 * 60 * 1000,
    read: false,
  },
  {
    _id: "msg_4",
    conversationId: "conv_marcus_alex",
    senderId: "demo_student_01",
    senderName: "Alex Rivera",
    text: "Hi Marcus, I have submitted my physics assignment draft.",
    timestamp: Date.now() - 3 * 3600 * 1000,
    read: true,
  },
  {
    _id: "msg_5",
    conversationId: "conv_marcus_alex",
    senderId: "teacher_usr_02",
    senderName: "Marcus Chen",
    text: "Great job on the quantum mechanics problem set. All solutions verified.",
    timestamp: Date.now() - 2 * 3600 * 1000,
    read: true,
  },
];

export function getLocalConversations(userId?: string): StoredConversation[] {
  if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_CONVOS_KEY);
    let convos: StoredConversation[] = raw ? JSON.parse(raw) : [];
    if (!convos || convos.length === 0) {
      convos = INITIAL_CONVERSATIONS;
      localStorage.setItem(STORAGE_CONVOS_KEY, JSON.stringify(convos));
    }
    if (userId) {
      return convos.filter((c) => c.participants.includes(userId) || c.participants.includes("demo_student_01"));
    }
    return convos;
  } catch {
    return INITIAL_CONVERSATIONS;
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
  if (typeof window === "undefined") return INITIAL_MESSAGES.filter((m) => m.conversationId === conversationId);
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    let messages: StoredMessage[] = raw ? JSON.parse(raw) : [];
    if (!messages || messages.length === 0) {
      messages = INITIAL_MESSAGES;
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    }
    return messages.filter((m) => m.conversationId === conversationId);
  } catch {
    return INITIAL_MESSAGES.filter((m) => m.conversationId === conversationId);
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
