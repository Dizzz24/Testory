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
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    // Can only complete CONFIRMED orders
    if (order.status !== "CONFIRMED") {
      return Response.json(
        { error: "Hanya order CONFIRMED yang bisa diselesaikan" },
        { status: 400 }
      );
    }

    // Mark as completed
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error completing order:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
