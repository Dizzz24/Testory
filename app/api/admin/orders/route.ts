import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    let status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    status = status ? status.toUpperCase() : null;

    const skip = (page - 1) * limit;

    if (status && !["READY", "INCOMING", "PO"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
      ];
    }

    // Fetch orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { status: "asc" }, // PENDING first
          { expiresAt: "asc" }, // Expiring soon first
        ],
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Add computed fields
    const ordersWithExtras = orders.map((order) => {
      const now = new Date();
      const timeLeft = order.expiresAt.getTime() - now.getTime();
      const timeLeftMinutes =
        order.status === "PENDING"
          ? Math.max(0, Math.floor(timeLeft / 60000))
          : null;

      return {
        ...order,
        timeLeftMinutes,
        itemCount: order.items.length,
      };
    });

    return Response.json({
      orders: ordersWithExtras,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
