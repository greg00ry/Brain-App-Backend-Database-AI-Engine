export function USER_PROFILE_PROMPT(
  conversationSample: string,
  existingProfile: string | null,
): string {
  const existing = existingProfile
    ? `\nCURRENT PROFILE (update/extend, don't lose info):\n${existingProfile}\n`
    : '';

  return `Analyze this conversation and write a short user profile (3-5 sentences max).
Focus on: communication style, language preference, technical level, topics they care about, how they like to be answered.
Write in second person ("User prefers...", "User communicates...").
Return ONLY the profile text, no JSON, no headers.
${existing}
CONVERSATION SAMPLE:
${conversationSample}`;
}

export function buildSystemPrompt(basePrompt: string, userProfile: string | null): string {
  if (!userProfile) return basePrompt;
  return `${basePrompt}\n\nUSER PROFILE:\n${userProfile}`;
}
