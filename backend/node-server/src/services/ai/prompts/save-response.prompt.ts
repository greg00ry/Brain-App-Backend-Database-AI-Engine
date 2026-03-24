export const SAVE_RESPONSE_PROMPT = (text: string): string =>
  `Ktoś właśnie Ci powiedział: "${text}"

Odpowiedz bezpośrednio do tej osoby. Potwierdź krótko i zadaj JEDNO konkretne pytanie żeby dowiedzieć się więcej. Nie pisz "Zapisano". Używaj "ty/Ty" nie "użytkownik".`;
