import { Types } from "mongoose";
import { ChatHistory, IChatMessage, MessageRole } from "../../models/ChatHistory.model.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT HISTORY SERVICE - Conversation Memory Management
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatMessageDTO {
  role: MessageRole;
  content: string;
}

// ─── Add Message ─────────────────────────────────────────────────────────────

/**
 * Dodaje wiadomość do historii rozmowy
 */
export async function addChatMessage(
  userId: string | Types.ObjectId,
  role: MessageRole,
  content: string,
  sessionId?: string
): Promise<IChatMessage> {
  console.log(`[ChatHistoryService] Adding ${role} message for user:`, userId);

  try {
    // Znajdź lub utwórz sesję
    const session = await ChatHistory.findOrCreateSession(userId, sessionId);

    // Dodaj wiadomość
    const message = session.addMessage(role, content);

    // Trim history jeśli za długa (zostaw ostatnie 50)
    session.trimHistory(50);

    // Zapisz
    await session.save();

    console.log(`[ChatHistoryService] ✓ Message added (total: ${session.messages.length})`);

    return message;
  } catch (error) {
    console.error('[ChatHistoryService] Error adding message:', error);
    throw error;
  }
}

// ─── Get Recent Messages ─────────────────────────────────────────────────────

/**
 * Pobiera ostatnie N wiadomości dla użytkownika
 * Używane do przekazania kontekstu do Intent Service
 */
export async function getChatHistory(
  userId: string | Types.ObjectId,
  limit = 10,
  sessionId?: string
): Promise<ChatMessageDTO[]> {
  console.log(`[ChatHistoryService] Getting last ${limit} messages for user:`, userId);

  try {
    // Znajdź sesję
    const session = await ChatHistory.findOrCreateSession(userId, sessionId);

    // Pobierz ostatnie N wiadomości
    const recentMessages = session.getRecentMessages(limit);

    // Konwertuj do DTO (bez timestamp, tylko role + content)
    const messages: ChatMessageDTO[] = recentMessages.map((msg: IChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log(`[ChatHistoryService] ✓ Retrieved ${messages.length} messages`);

    return messages;
  } catch (error) {
    console.error('[ChatHistoryService] Error getting chat history:', error);
    // Fallback: zwróć pustą tablicę
    return [];
  }
}

// ─── Clear Session ───────────────────────────────────────────────────────────

/**
 * Czyści historię dla sesji (reset rozmowy)
 */
export async function clearChatHistory(
  userId: string | Types.ObjectId,
  sessionId?: string
): Promise<void> {
  console.log('[ChatHistoryService] Clearing chat history for user:', userId);

  try {
    if (sessionId) {
      // Usuń konkretną sesję
      await ChatHistory.deleteOne({ userId, sessionId });
    } else {
      // Usuń wszystkie sesje użytkownika
      await ChatHistory.deleteMany({ userId });
    }

    console.log('[ChatHistoryService] ✓ Chat history cleared');
  } catch (error) {
    console.error('[ChatHistoryService] Error clearing chat history:', error);
    throw error;
  }
}

// ─── Get All Sessions ────────────────────────────────────────────────────────

/**
 * Pobiera listę wszystkich sesji użytkownika
 */
export async function getUserSessions(
  userId: string | Types.ObjectId
): Promise<Array<{ sessionId: string; lastMessage: string; updatedAt: Date }>> {
  try {
    const sessions = await ChatHistory.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return sessions.map(session => ({
      sessionId: session.sessionId,
      lastMessage: session.messages[session.messages.length - 1]?.content || '',
      updatedAt: session.updatedAt,
    }));
  } catch (error) {
    console.error('[ChatHistoryService] Error getting user sessions:', error);
    return [];
  }
}

// ─── Create New Session ──────────────────────────────────────────────────────

/**
 * Tworzy nową sesję rozmowy dla użytkownika
 */
export async function createNewSession(
  userId: string | Types.ObjectId
): Promise<string> {
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await ChatHistory.create({
    userId,
    sessionId: newSessionId,
    messages: [],
  });

  console.log(`[ChatHistoryService] ✓ Created new session: ${newSessionId}`);

  return newSessionId;
}
