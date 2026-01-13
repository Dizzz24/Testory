// app/api/orders/track/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .regex(/^ORD-\d{8}-[A-Z0-9]{5}$/, "Format order number tidak valid"),
  phoneLast4: z
    .string()
    .length(4, "Nomor HP hanya 4 digit terakhir")
    .regex(/^\d{4}$/, "Nomor HP harus berupa angka"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = trackOrderSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { orderNumber, phoneLast4 } = validation.data;

    // Find order with phone verification
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerPhone: { endsWith: phoneLast4 },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                brand: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return Response.json(
        { error: "Pesanan tidak ditemukan atau nomor HP tidak cocok" },
        { status: 404 }
      );
    }

    // Calculate time left (if still pending)
    let timeLeftMinutes = null;
    if (order.status === "PENDING") {
      const now = new Date();
      const timeLeft = order.expiresAt.getTime() - now.getTime();
      timeLeftMinutes = Math.max(0, Math.floor(timeLeft / 60000));
    }

    return Response.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        confirmedAt: order.confirmedAt,
        completedAt: order.completedAt,
        timeLeftMinutes,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
          product: item.product,
        })),
      },
    });
  } catch (error) {
    console.error("Error tracking order:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
