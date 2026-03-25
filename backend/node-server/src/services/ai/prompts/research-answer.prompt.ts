export const RESEARCH_ANSWER_PROMPT = (
  userText: string,
  context: string,
  chatHistory?: { role: string; content: string }[],
): string => {
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    history = '\nCONVERSATION HISTORY:\n' +
      chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Brain'}: ${m.content}`).join('\n') +
      '\n';
  }

  return `Answer the user's question based on their personal memory vault below.
If the context is relevant, use it. If not, say you don't have that info yet and ask if they want to tell you about it.
${history}
MEMORY CONTEXT:
${context}

USER: ${userText}`;
};
