/**
 * Validates and normalizes phone numbers.
 * Supports Pakistani local (03XX XXXXXXX) and international (+92 3XX XXXXXXX, +1, +44, etc.)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, normalized: "", error: "Phone number is required." };
  }

  const cleaned = phone.trim().replace(/[\s\-()]/g, "");

  // Pakistani local mobile: starts with 03 and has 11 digits
  const pkLocalRegex = /^03\d{9}$/;
  // Pakistani international mobile: starts with +923 or 00923 and has 12 or 13 digits
  const pkIntlRegex = /^(\+92|0092)3\d{9}$/;
  // General international: starts with + followed by 8 to 15 digits
  const generalIntlRegex = /^\+[1-9]\d{7,14}$/;

  if (pkLocalRegex.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  if (pkIntlRegex.test(cleaned)) {
    const formatted = cleaned.replace(/^0092/, "+92");
    return { valid: true, normalized: formatted };
  }
  if (generalIntlRegex.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  return {
    valid: false,
    normalized: cleaned,
    error: "Please enter a valid phone number (e.g. 0300-1234567 or +92 300 1234567).",
  };
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : "";
}

/**
 * Generate human-readable order numbers e.g. RF-2026-4892
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `RF-${year}-${randomChar}${randomSuffix}`;
}

export function formatPricePKR(price: number): string {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}
