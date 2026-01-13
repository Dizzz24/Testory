import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get order counts by status
    const [
      pendingCount,
      confirmedCount,
      completedCount,
      expiredCount,
      cancelledCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.count({ where: { status: "EXPIRED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalAmount: true },
      }),
    ]);

    // Get orders expiring soon (< 10 minutes)
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    const expiringSoon = await prisma.order.count({
      where: {
        status: "PENDING",
        expiresAt: {
          gte: now,
          lte: tenMinutesFromNow,
        },
      },
    });

    return Response.json({
      stats: {
        pending: pendingCount,
        confirmed: confirmedCount,
        completed: completedCount,
        expired: expiredCount,
        cancelled: cancelledCount,
        expiringSoon,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
