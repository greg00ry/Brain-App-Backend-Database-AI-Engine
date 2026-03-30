export const SAVE_RESPONSE_PROMPT = (
  text: string,
  chatHistory?: { role: string; content: string }[],
): string => {
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    history = '\nOSTATNIA ROZMOWA:\n' +
      chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Brain'}: ${m.content}`).join('\n') +
      '\n';
  }

  return `Ktoś właśnie Ci powiedział: "${text}"
${history}
Odpowiedz bezpośrednio do tej osoby. Potwierdź krótko co powiedziała i zadaj JEDNO konkretne pytanie pogłębiające. Nie pisz "Zapisano". Zacznij od czegoś innego niż słowo "Ty".`;
};
