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

    // Can only cancel PENDING orders
    if (order.status !== "PENDING") {
      return Response.json(
        { error: "Hanya order PENDING yang bisa dibatalkan" },
        { status: 400 }
      );
    }

    // Cancel order in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const cancelled = await tx.order.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      });

      // Release reserved stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            reserved: { decrement: item.quantity },
          },
        });
      }

      return cancelled;
    });

    return Response.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
