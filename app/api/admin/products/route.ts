// app/api/admin/products/route.ts
import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Check auth
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;

    let status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const brand = searchParams.get("brand");
    const includeInactive = searchParams.get("includeInactive") === "true";

    status = status ? status.toUpperCase() : null;

    if (status && !["READY", "INCOMING", "PO"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isActive: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.product.count({ where }),
    ]);

    return Response.json({
      products: products.map((p) => ({
        ...p,
        availableStock: p.stock - p.reserved,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
