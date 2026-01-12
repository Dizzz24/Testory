import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Inisialisasi Redis dari environment
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiter sliding window
const orderRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
  prefix: "order",
});

// Helper function cek rate limit berdasarkan phoneHash
export async function checkOrderRateLimit(phone: string) {
  const crypto = require("crypto");
  const phoneHash = crypto
    .createHash("sha256")
    .update(phone)
    .digest("hex")
    .slice(0, 16);
  const { success, reset } = await orderRateLimit.limit(phoneHash);

  return { allowed: success, resetAt: reset ? reset * 1000 : undefined };
}

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
