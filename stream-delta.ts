/** Text the user should see from one provider stream event. Reasoning stays hidden. */
export function textDeltaFromStreamEvent(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const event = json as {
    type?: unknown;
    delta?: unknown;
    choices?: { delta?: { content?: unknown } }[];
  };
  const type = typeof event.type === "string" ? event.type : "";
  if (type.includes("reasoning")) return "";
  if (typeof event.delta === "string" && type.includes("output_text")) return event.delta;
  const content = event.choices?.[0]?.delta?.content;
  return typeof content === "string" ? content : "";
}
