import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { productPublicSelect } from "@/lib/productPublicSelect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    let status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    status = status ? status.toUpperCase() : null;

    if (status && !["READY", "INCOMING", "PO"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { processor: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseInt(minPrice);
      if (maxPrice) where.price.lte = parseInt(maxPrice);
    }

    // Fetch products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: productPublicSelect,
      }),
      prisma.product.count({ where }),
    ]);

    // Add computed field: availableStock
    const productsWithAvailable = products.map((p) => ({
      ...p,
      availableStock: p.stock - p.reserved,
    }));

    return Response.json({
      products: productsWithAvailable,
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
