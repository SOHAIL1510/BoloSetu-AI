/**
 * Utility service to handle language mapping and speech parameters.
 */
export function getLanguageScriptLabel(languageCode: string): string {
  const code = languageCode.toLowerCase();
  if (code.startsWith("hi")) return "Hindi (Devnagari Script)";
  if (code.startsWith("mr")) return "Marathi (Devnagari Script)";
  if (code.startsWith("en")) return "Indian English";
  return "English";
}

/**
 * Checks if the customer response text matches closing remarks in any supported language
 */
export function isCallClosingRemark(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("goodbye") ||
    t.includes("thank you for your time") ||
    t.includes("have a great day") ||
    t.includes("have a wonderful day") ||
    t.includes("dhanyawad") ||
    t.includes("dhanyavad") ||
    t.includes("shukriya") ||
    t.includes("alvida") ||
    t.includes("bye bye") ||
    t.includes("thank you, bye")
  );
}
