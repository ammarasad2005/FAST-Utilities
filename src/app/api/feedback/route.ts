import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin";

export const dynamic = 'force-dynamic';

// POST /api/feedback - Public route to submit feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, category, rating, content } = body;

    // Validate content
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Feedback content is required." }, { status: 400 });
    }

    // Validate category
    const validCategories = ["bug_report", "suggestion", "review", "inquiry"];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ error: "A valid feedback category is required." }, { status: 400 });
    }

    // Validate rating
    const ratingInt = parseInt(rating);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5." }, { status: 400 });
    }

    // Insert into database
    const { data, error } = await supabase
      .from("campus_feedback")
      .insert({
        email: email && typeof email === "string" && email.trim() ? email.trim() : null,
        category,
        rating: ratingInt,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert feedback error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, feedback: data });

  } catch (error: any) {
    console.error("Feedback submit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback. Make sure database table exists." },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Secure route for administrators to fetch all submissions
export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: feedbackList, error } = await supabase
      .from("campus_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch feedback error:", error);
      throw error;
    }

    return NextResponse.json({ feedback: feedbackList || [] });

  } catch (error: any) {
    console.error("Fetch feedback error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve feedback logs." },
      { status: 500 }
    );
  }
}
