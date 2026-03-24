export const SAVE_RESPONSE_PROMPT = (text: string): string =>
  `Ktoś właśnie Ci powiedział: "${text}"

Odpowiedz bezpośrednio do tej osoby. Potwierdź krótko co powiedziała i zadaj JEDNO konkretne pytanie pogłębiające. Nie pisz "Zapisano". Zacznij od czegoś innego niż słowo "Ty".`;
