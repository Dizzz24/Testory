// app/api/admin/me/route.ts
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const adminToken = await getCurrentAdmin();

    if (!adminToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminToken.adminId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return Response.json({ error: "Admin not found" }, { status: 404 });
    }

    return Response.json({ admin });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
