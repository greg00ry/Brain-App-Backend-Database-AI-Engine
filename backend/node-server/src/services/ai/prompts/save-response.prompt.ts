export const SAVE_RESPONSE_PROMPT = (text: string): string =>
  `The user just shared this with you: "${text}"

Acknowledge what they said briefly, then ask ONE curious follow-up question to learn more about it.`;
