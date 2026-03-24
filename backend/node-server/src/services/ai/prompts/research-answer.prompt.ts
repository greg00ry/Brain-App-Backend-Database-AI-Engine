export const RESEARCH_ANSWER_PROMPT = (
  userText: string,
  context: string,
): string => {
  return `Answer the user's question based on their personal memory vault below.
If the context is relevant, use it. If not, say you don't have that info yet and ask if they want to tell you about it.

MEMORY CONTEXT:
${context}

USER: ${userText}`;
};
