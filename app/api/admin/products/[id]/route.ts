// app/api/admin/products/[id]/route.ts
import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(3).optional(),
  brand: z.string().min(2).optional(),
  processor: z.string().min(3).optional(),
  ram: z.string().min(2).optional(),
  storage: z.string().min(2).optional(),
  gpu: z.string().optional(),
  display: z.string().optional(),
  originalPrice: z.number().int().positive().nullable().optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  status: z.enum(["READY", "INCOMING", "PO"]).optional(),
  images: z.array(z.string().url()).min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Validate originalPrice > price
    const finalOriginalPrice =
      data.originalPrice !== undefined
        ? data.originalPrice
        : existingProduct.originalPrice;
    const finalPrice = data.price || existingProduct.price;

    if (finalOriginalPrice && finalOriginalPrice <= finalPrice) {
      return Response.json(
        { error: "Harga asli harus lebih besar dari harga jual" },
        { status: 400 }
      );
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return Response.json({ success: true, product });
  } catch (error) {
    console.error("Error updating product:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return Response.json({ success: true, product });
  } catch (error: any) {
    console.error("Error deleting product:", error);

    if (error.code === "P2025") {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
