// Generate unique order number
export function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5 random chars
  return `ORD-${datePart}-${randomPart}`;
}

// Normalize phone number to +62 format
export function normalizePhone(phone: string): string {
  // Remove spaces and dashes
  let normalized = phone.replace(/[\s-]/g, "");

  // Convert to +62 format
  if (normalized.startsWith("0")) {
    normalized = "+62" + normalized.slice(1);
  } else if (normalized.startsWith("62")) {
    normalized = "+" + normalized;
  } else if (!normalized.startsWith("+")) {
    normalized = "+62" + normalized;
  }

  return normalized;
}

// Validate phone number (Indonesian)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,10}$/;
  return phoneRegex.test(phone);
}

// Format price to Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Hash phone for rate limiting (privacy)
export function hashPhone(phone: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(phone).digest("hex").slice(0, 16);
}
