// app/api/products/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { productPublicSelect } from "@/lib/productPublicSelect";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: productPublicSelect,
    });

    console.log("Fetched product:", product);

    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({
      ...product,
      availableStock: product.stock - product.reserved,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
