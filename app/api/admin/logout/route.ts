// app/api/admin/logout/route.ts
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin_token");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error logging out:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
