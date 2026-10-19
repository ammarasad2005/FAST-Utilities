import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin";

export const dynamic = 'force-dynamic';

// DELETE /api/feedback/[id] - Secure route for administrators to delete a submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Feedback ID is required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("campus_feedback")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete feedback error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete feedback error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete feedback entry." },
      { status: 500 }
    );
  }
}
