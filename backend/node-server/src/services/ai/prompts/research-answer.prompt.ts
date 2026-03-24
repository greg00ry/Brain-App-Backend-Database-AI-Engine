export const RESEARCH_ANSWER_PROMPT = (
  userText: string,
  context: string,
  chatHistory?: { role: string; content: string }[]
): string => {
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    history = '\nCONVERSATION HISTORY:\n';
    chatHistory.slice(-3).forEach(msg => {
      history += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
  }

  return `You are a helpful assistant with access to the user's personal memory vault.
Answer the user's question based on the memory context below.
Be concise and direct. If the context doesn't contain relevant information, say so.
${history}
MEMORY CONTEXT:
${context}

USER QUESTION: ${userText}`;
};
