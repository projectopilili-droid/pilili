const EMAIL = "projectopilili@gmail.com";
const WHATSAPP = "244923939211";

export function deliveryLinks(subject: string, body: string): { whatsapp: string; email: string } {
  const text = `${subject.trim()}\n\n${body.trim()}`.slice(0, 1200);
  return {
    whatsapp: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,
    email: `mailto:${EMAIL}?subject=${encodeURIComponent(subject.trim().slice(0, 80))}&body=${encodeURIComponent(text)}`,
  };
}

function openQuiet(href: string, blank: boolean) {
  const link = document.createElement("a");
  link.href = href;
  if (blank) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  link.tabIndex = -1;
  link.setAttribute("aria-hidden", "true");
  link.style.position = "fixed";
  link.style.left = "-9999px";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Sends the form text without printing the destination on the page. */
export function deliverMessage(subject: string, body: string) {
  if (typeof document === "undefined") return;
  const links = deliveryLinks(subject, body);
  openQuiet(links.whatsapp, true);
  openQuiet(links.email, false);
}
