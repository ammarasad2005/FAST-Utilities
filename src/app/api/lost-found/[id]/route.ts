import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { 
  sendVerificationRequestEmail, 
  sendClaimRecordedEmail, 
  sendNewClaimNotificationToOthers,
  sendClaimNotificationToReporter
} from "@/lib/email";
import { isAdminAuthenticated } from "@/lib/admin";

export const dynamic = 'force-dynamic';

// GET /api/lost-found/[id] - Get item details with claims
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: item, error } = await supabase
      .from("lost_found_items")
      .select("*, lost_found_claims(*)")
      .eq("id", id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const mappedItem = {
      id: item.id,
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      location: item.location,
      handoffNote: item.handoff_note,
      parsedFoundAt: item.parsed_found_at ?? undefined,
      parsedSubmittedAt: item.parsed_submitted_at ?? undefined,
      rawFoundAt: item.raw_found_at ?? undefined,
      rawSubmittedAt: item.raw_submitted_at ?? undefined,
      date: item.date,
      contactInfo: item.contact_info,
      reporterName: item.reporter_name,
      isResolved: item.is_resolved,
      resolvedBy: item.resolved_by,
      imageUrl: item.image_url,
      resolutionImageUrl: item.resolution_image_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      claims: (item.lost_found_claims || []).filter((c: any) => c.status !== 'unclaimed'),
    };

    return NextResponse.json({ item: mappedItem });
  } catch (error) {
    console.error("Error fetching item details:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

// PATCH /api/lost-found/[id] - Update a lost/found item (e.g., mark as resolved, register claim)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Handle Admin toggle resolution action
    if (body.action === 'admin-toggle-resolved') {
      if (!isAdminAuthenticated(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const { data: item, error: updateError } = await supabase
        .from("lost_found_items")
        .update({ 
          is_resolved: body.isResolved,
          resolved_by: body.resolvedBy || 'admin'
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (body.isResolved) {
        const { data: pendingClaims } = await supabase
          .from('lost_found_claims')
          .select('*')
          .eq('item_id', id)
          .eq('status', 'pending');

        if (pendingClaims && pendingClaims.length > 0) {
          const origin = request.nextUrl.origin;
          for (const claim of pendingClaims) {
            await sendVerificationRequestEmail(claim.claimer_email, item.title, claim.id, origin);
          }
        }
      }

      const mappedItem = {
        id: item.id,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        location: item.location,
        date: item.date,
        contactInfo: item.contact_info,
        isResolved: item.is_resolved,
        imageUrl: item.image_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };

      return NextResponse.json({ item: mappedItem });
    }

    // Handle "claim" action
    if (body.action === 'claim' && body.claimerId) {
      const email = body.claimerEmail?.toLowerCase().trim()

      if (email) {
        // Check if there is already an active pending claim for this item and email
        const { data: existingClaims } = await supabase
          .from('lost_found_claims')
          .select('id')
          .eq('item_id', id)
          .eq('claimer_email', email)
          .eq('status', 'pending')

        if (existingClaims && existingClaims.length > 0) {
          return NextResponse.json({ 
            error: 'You have already registered a pending claim for this item under this email address. Please resolve or unclaim your existing match first.' 
          }, { status: 400 })
        }
      }

      const { data: newClaim, error: claimError } = await supabase
        .from('lost_found_claims')
        .insert({ 
          item_id: id, 
          claimer_id: body.claimerId,
          claimer_email: email,
          lost_item_id: body.lostItemId,
          status: 'pending'
        })
        .select()
        .single();
      
      if (claimError) throw claimError;

      // Send initial transparency and verification request emails
      if (email) {
        const { data: item } = await supabase.from('lost_found_items').select('title, contact_info, type').eq('id', id).single();
        if (item) {
          // Fetch all active pending claims for this item (including the new one)
          const { data: allClaims } = await supabase
            .from('lost_found_claims')
            .select('claimer_email')
            .eq('item_id', id)
            .eq('status', 'pending');

          const activeClaimersEmails = allClaims ? allClaims.map(c => c.claimer_email).filter(Boolean) as string[] : [];
          const totalCount = activeClaimersEmails.length;

          const origin = request.nextUrl.origin;

          // 1. Send unique Claim Recorded email to the current claimer
          await sendClaimRecordedEmail(email, item.title, newClaim.id, totalCount, activeClaimersEmails, origin);

          // 2. Notify all other active claimers
          const otherClaimers = activeClaimersEmails.filter(e => e.toLowerCase().trim() !== email.toLowerCase().trim());
          for (const otherEmail of otherClaimers) {
            await sendNewClaimNotificationToOthers(otherEmail, item.title, email, totalCount, activeClaimersEmails, origin);
          }

          // 3. Notify the original found reporter if they provided their email
          if (item.type === 'found' && item.contact_info && item.contact_info.includes('@') && item.contact_info.toLowerCase().trim() !== 'not provided') {
            await sendClaimNotificationToReporter(item.contact_info, item.title, email, totalCount, activeClaimersEmails, origin);
          }
        }
      }
      
      return NextResponse.json({ success: true, claimId: newClaim.id });
    }

    const { data: existingItem, error: fetchError } = await supabase
      .from("lost_found_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.location !== undefined) updateData.location = body.location.trim();
    if (body.contactInfo !== undefined) updateData.contact_info = body.contactInfo.trim();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl?.trim() || null;
    if (body.isResolved !== undefined) updateData.is_resolved = body.isResolved;
    if (body.resolvedBy !== undefined) updateData.resolved_by = body.resolvedBy;
    if (body.resolutionImageUrl !== undefined) updateData.resolution_image_url = body.resolutionImageUrl;
    if (body.date !== undefined) updateData.date = new Date(body.date).toISOString();

    const { data: item, error: updateError } = await supabase
      .from("lost_found_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If resolved, sync claimant's lost item resolution and link them in resolved_by field
    if (body.isResolved) {
      if (item && item.type === 'found') {
        const { data: claims } = await supabase
          .from('lost_found_claims')
          .select('*')
          .eq('item_id', id);

        let lostItemId = null;
        let claimerId = body.resolvedBy || 'anon';

        if (claims && claims.length > 0) {
          const activeClaim = claims[0];
          claimerId = activeClaim.claimer_id || claimerId;
          lostItemId = activeClaim.lost_item_id;

          if (!lostItemId && activeClaim.claimer_email) {
            const { data: fallbackLost } = await supabase
              .from('lost_found_items')
              .select('id')
              .eq('type', 'lost')
              .eq('is_resolved', false)
              .eq('contact_info', activeClaim.claimer_email.toLowerCase().trim());

            if (fallbackLost && fallbackLost.length > 0) {
              lostItemId = fallbackLost[0].id;
            }
          }
        } else if (body.resolvedBy && body.resolvedBy.includes('@')) {
          // Fallback if resolvedBy is email
          const { data: fallbackLost } = await supabase
            .from('lost_found_items')
            .select('id')
            .eq('type', 'lost')
            .eq('is_resolved', false)
            .eq('contact_info', body.resolvedBy.toLowerCase().trim());

          if (fallbackLost && fallbackLost.length > 0) {
            lostItemId = fallbackLost[0].id;
          }
        }

        if (lostItemId) {
          // 1. Update found item resolved_by to hold the linked lost item
          await supabase
            .from('lost_found_items')
            .update({ 
              resolved_by: `${claimerId}:${lostItemId}`,
              resolution_image_url: body.resolutionImageUrl || item.resolution_image_url
            })
            .eq('id', id);

          // 2. Resolve claimant's lost report and store the found item link
          await supabase
            .from('lost_found_items')
            .update({ 
              is_resolved: true,
              resolved_by: `${claimerId}:${id}`,
              resolution_image_url: body.resolutionImageUrl || item.resolution_image_url
            })
            .eq('id', lostItemId);

          // 3. Try to update claim status to verified for good measure (might be blocked by RLS, which is fine since we now bypass it)
          const matchingClaim = claims?.find(c => c.item_id === id);
          if (matchingClaim) {
            await supabase
              .from('lost_found_claims')
              .update({ status: 'verified', lost_item_id: lostItemId })
              .eq('id', matchingClaim.id);
          }
        }
      }

      // Also send reminders to any remaining pending claimers (if any left after updates)
      const { data: pendingClaims } = await supabase
        .from('lost_found_claims')
        .select('*')
        .eq('item_id', id)
        .eq('status', 'pending');

      if (pendingClaims && pendingClaims.length > 0) {
        const origin = request.nextUrl.origin;
        for (const claim of pendingClaims) {
          await sendVerificationRequestEmail(claim.claimer_email, item.title, claim.id, origin);
        }
      }
    }

    const mappedItem = {
      id: item.id,
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      location: item.location,
      date: item.date,
      contactInfo: item.contact_info,
      isResolved: item.is_resolved,
      imageUrl: item.image_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };

    return NextResponse.json({ item: mappedItem });
  } catch (error) {
    console.error("Error updating lost/found item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/lost-found/[id] - Delete a lost/found item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = params;

    const { data: existingItem, error: fetchError } = await supabase
      .from("lost_found_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("lost_found_items")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lost/found item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
