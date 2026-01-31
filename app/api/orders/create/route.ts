// app/api/orders/create/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateOrderNumber,
  normalizePhone,
  isValidPhone,
  checkOrderRateLimit,
} from "@/lib/utils";
import { z } from "zod";

// Validation schema - LIMIT TO 1 PRODUCT
const createOrderSchema = z.object({
  customerName: z.string().min(3, "Nama minimal 3 karakter"),
  customerPhone: z.string().refine(isValidPhone, "Format nomor HP tidak valid"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Minimal pesan 1 produk")
    .max(1, "Hanya bisa memesan 1 produk per transaksi"), // ← NEW: Max 1 item
});

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { customerName, customerPhone, notes, items } = validation.data;
    const normalizedPhone = normalizePhone(customerPhone);

    // Since we only allow 1 product, no need to merge duplicates
    // items.length is guaranteed to be 1 by schema validation

    // 2. Rate limiting
    const rateLimit = await checkOrderRateLimit(normalizedPhone);

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt!);
      return Response.json(
        {
          error: "Terlalu banyak pesanan",
          message: `Anda sudah membuat 3 pesanan dalam 15 menit terakhir. Silakan coba lagi setelah ${resetDate.toLocaleTimeString(
            "id-ID",
          )}`,
          resetAt: resetDate.toISOString(),
        },
        { status: 429 },
      );
    }

    // 3. Fetch product (only 1 product - phase 1)
    const productId = items[0].productId;
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      return Response.json(
        { error: "Produk tidak ditemukan atau tidak tersedia" },
        { status: 404 },
      );
    }

    // 4. Validate stock availability
    const requestedQty = items[0].quantity;
    const availableStock = product.stock - product.reserved;

    if (availableStock < requestedQty) {
      return Response.json(
        {
          error: "Stok tidak mencukupi",
          product: {
            id: product.id,
            name: product.name,
            available: availableStock,
            requested: requestedQty,
          },
        },
        { status: 400 },
      );
    }

    // 5. Calculate total amount
    const subtotal = product.price * requestedQty;

    const orderItem = {
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      quantity: requestedQty,
      subtotal,
    };

    // 6. Create order (SOFT RESERVE - no stock changes)
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName,
        customerPhone: normalizedPhone,
        notes: notes || null,
        totalAmount: subtotal,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: {
          create: [orderItem],
        },
      },
      include: {
        items: true,
      },
    });

    // 7. Generate WhatsApp link
    const productName = order.items[0].productName;
    const totalAmount = order.totalAmount.toLocaleString("id-ID");
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || "6281314998265";

    const waMessage =
      `Halo Admin! Saya mau order:\n\n` +
      `📦 *${productName}*\n` +
      `💰 Total: *Rp ${totalAmount}*\n` +
      `🔢 Order ID: *${order.orderNumber}*\n` +
      `👤 Nama: ${customerName}\n` +
      `📱 HP: ${normalizedPhone}\n\n` +
      `Mohon info rekening untuk transfer. Terima kasih!`;

    const whatsappLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
      waMessage,
    )}`;

    return Response.json(
      {
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          expiresAt: order.expiresAt,
          items: order.items,
          whatsappLink,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating order:", error);

    if (error.message.includes("Stok")) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
