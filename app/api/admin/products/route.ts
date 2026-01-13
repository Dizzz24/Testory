// app/api/admin/products/route.ts
import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

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
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
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

// POST / Create new product
const createProductSchema = z.object({
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  brand: z.string().min(2, "Brand minimal 2 karakter"),
  processor: z.string().min(3),
  ram: z.string().min(2),
  storage: z.string().min(2),
  gpu: z.string().optional(),
  display: z.string().optional(),
  originalPrice: z.number().int().positive().optional(),
  price: z.number().int().positive("Harga harus positif"),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  status: z.enum(["READY", "INCOMING", "PO"]),
  images: z.array(z.string().url()).min(1, "Minimal 1 gambar"),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check auth
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate originalPrice > price
    if (data.originalPrice && data.originalPrice <= data.price) {
      return Response.json(
        { error: "Harga asli harus lebih besar dari harga jual" },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        brand: data.brand,
        processor: data.processor,
        ram: data.ram,
        storage: data.storage,
        gpu: data.gpu || null,
        display: data.display || null,
        originalPrice: data.originalPrice || null,
        price: data.price,
        stock: data.stock,
        reserved: 0,
        status: data.status,
        images: data.images,
        description: data.description || null,
        isActive: true,
      },
    });

    return Response.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
