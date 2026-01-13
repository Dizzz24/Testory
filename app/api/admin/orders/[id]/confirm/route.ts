import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    let { status } = order;

    if (status && !["READY", "INCOMING", "PO"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate order status
    if (status !== "PENDING") {
      return Response.json(
        {
          error: "Order tidak dapat dikonfirmasi",
          reason:
            status === "EXPIRED"
              ? "Order sudah expired"
              : "Order sudah diproses",
          currentStatus: status,
        },
        { status: 400 }
      );
    }

    // Validate not expired
    if (order.expiresAt < new Date()) {
      return Response.json(
        { error: "Order sudah kedaluwarsa" },
        { status: 400 }
      );
    }

    // Confirm order in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const confirmed = await tx.order.update({
        where: { id: params.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      // Reduce stock and reserved for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }

      return confirmed;
    });

    return Response.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
