---
doc: 07-UI-BLUEPRINTS/12-lost-found
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/lost-found` (Lost & Found Marketplace)

**Page file:** `src/app/lost-found/page.tsx:1-6553`
**Render mode:** `'use client'` + `export const dynamic = 'force-dynamic'` (`src/app/lost-found/page.tsx:1,87`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page wraps inner `<LostFoundView>` in `<Suspense>` (`src/app/lost-found/page.tsx:6432-6446`) because it uses `useSearchParams()` for `?verifyClaimId=X`.

The page implements a **subView state machine** with 5 views (all under same route — no URL change):
- `list` (default) — browse active items
- `detail` — single item detail
- `report` — 4-step report wizard
- `history` — resolved items gallery
- `resolution` — matched lost+found pair detail

## Blueprint Convention Legend

```
┌─┐│└┘├┤┬┴┼   Box-drawing characters for layout containers
╭─╮│╰╯          Rounded-card corners
─ │ · ·         Horizontal / vertical / dotted dividers
◉ Label         Interactive element (button / link / input)
[placeholder]   Text-input field
🔍 (icon emoji) lucide-react icon
{state guard}   Conditional render
[link → /path]  Navigation target
```

## Desktop (≥1024px) — subView='list' (Default)

`src/app/lost-found/page.tsx:6428-6553` renders the outer page shell (Header + main + Footer).
`src/app/lost-found/page.tsx:5723-6104` renders the list subView.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ◁ 🔍 Lost & Found  ⓘ3                                                 🔔 ◉  🌓 │  ← Header (sticky, rightActions=NotificationBell)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│  LOST & FOUND                                                                                                   │
│  Reunite students with their belongings                                                                         │
│  Report items you've lost or found on campus.                                                                   │
│                                                            ┌──────────────┬──────────────────┐                  │
│                                                            │ ◉ History    │ ◉ Report an Item │                  │
│                                                            └──────────────┴──────────────────┘                  │
│                                                                                                                  │
│  ┌── StatsDashboard (3-4 cards: Total/Lost/Found/Resolved) ─────────────────────────────────────────────────┐    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                                                                  │    │
│  │  │ 42   │  │ 18   │  │ 24   │  │ 12   │  ← click to filter by type/range                                  │    │
│  │  │Total │  │Lost  │  │Found │  │Resolv│                                                                  │    │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                                                                  │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                                  │
│  ───────────────  Section divider  ───────────────                                                              │
│                                                                                                                  │
│  ┌─ Search + Sort + Filter Bar ─────────────────────────────────────────┐                                       │
│  │ 🔍 [Search lost or found items...]                         ✕          │                                       │
│  └────────────────────────────────────────────────────────────────────────┘                                       │
│                                                                                                                  │
│  ┌─ Desktop 2-col layout ──────────────────────────┬────────────────────────────────────────────────────────┐  │
│  │ SIDEBAR (w-56)                                  │ MAIN CONTENT (flex-1)                                │  │
│  │ ┌─────────────────────────────────────────────┐ │  42 Active Items   Verified Records                  │  │
│  │ │ FilterSidebar:                              │ │                                                      │  │
│  │ │  🔍 [Search items...]                       │ │  ┌────────┬────────┬────────┐                        │  │
│  │ │  Sort By: [Newest First ▾]                  │ │  │ ◉Item  │ ◉Item  │ ◉Item  │  ← 2-3 col grid        │  │
│  │ │  TYPE: [All] [Lost] [Found]                 │ │  │ Card   │ Card   │ Card   │                        │  │
│  │ │  DATE RANGE: [All][Today][Week][Month]      │ │  └────────┴────────┴────────┘                        │  │
│  │ │  MY ITEMS: ☐ My Reports                     │ │  ┌────────┬────────┬────────┐                        │  │
│  │ │             ☐ Bookmarked                    │ │  │ ◉Item  │ ◉Item  │ ◉Item  │                        │  │
│  │ │             ☐ My Claims (email prompt)      │ │  └────────┴────────┴────────┘                        │  │
│  │ │  CATEGORY: [All][Electronics][Documents]…   │ │  …                                                  │  │
│  │ │  [Clear Filters]  [Share Summary]           │ │                                                      │  │
│  │ └─────────────────────────────────────────────┘ │                                                      │  │
│  └─────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘  │
│                                                                                                                  │
│  ┌── Footer (quick links + admin 🔑) ───────────────────────────────────────────────────────────────────────┐    │
│  │  ◉ Report Item    ◉ Browse Found    ◉ Browse Lost    ◉ History            FAST NUCES · Isb · 🔑 admin    │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `<ItemCard>` (each cell in grid)
```
┌──────────────────────────────┐
│ ┌── image (aspect-4/3) ────┐ │
│ │ [LOST] [Electronics]     │ │  ← top-left badges (LOST=accent-ee, FOUND=accent-af)
│ │              🔖 (bookmark)│ │  ← top-right bookmark button (hover only)
│ │ [image or category emoji]│ │
│ └──────────────────────────┘ │
│ Black Wallet          2h ago │
│                              │
│ 📍 Cafeteria                 │  ← location (or "Claim to reveal location" for found items)
│ 💬 "Near the coffee corner…" │  ← description (truncated)
│                              │
│ {isMyItem? ★ My Report}      │  ← badge if user reported this
│ {isUrgent? ⚡ Urgent}        │  ← pulsing red badge
│ {viewCount>0? 👁 23 views}   │
└──────────────────────────────┘
Click anywhere on card → openDetail(item) → subView='detail'
```

## Mobile (≤430px) — subView='list' (Default)

`src/app/lost-found/page.tsx:5800-6104` renders mobile branch. Header has NotificationBell + back chevron. 2-col grid for items, sticky bottom "Report an Item" pill, mobile-only Filters button + recently-viewed carousel.

```
┌─────────────────────────────────┐
│ [logo] ◁ Lost & Found  ⓘ3  🔔 🌓│  ← Header (sticky)
├─────────────────────────────────┤
│ LOST & FOUND                    │
│ Reunite students…               │
│            [History] [Report+] │  ← top-right CTA group
├─────────────────────────────────┤
│ Stats: 42 | 18 | 24 | 12       │  ← 2x2 stat cards on mobile
├─────────────────────────────────┤
│ 🔍 [Search items…]    [Filters]│  ← Filters button has count badge
├─────────────────────────────────┤
│ RECENTLY VIEWED                 │  ← horizontal carousel (mobile-only, if any)
│ [Card] [Card] [Card] →          │
├─────────────────────────────────┤
│ ┌────────┬────────┐             │  ← 2-col grid
│ │ ◉Item  │ ◉Item  │             │
│ │ Card   │ Card   │             │
│ └────────┴────────┘             │
│ ┌────────┬────────┐             │
│ │ ◉Item  │ ◉Item  │             │
│ └────────┴────────┘             │
│ …                               │
├─────────────────────────────────┤
│ ╔═══════════════════════════╗   │  ← sticky bottom Report pill (md:hidden fixed bottom-4)
│ ║     ◉ Report an Item      ║   │
│ ╚═══════════════════════════╝   │
└─────────────────────────────────┘
```

### Mobile Quick Action Bar (`selectedQuickActionItem !== null`)
```
When user long-presses / taps the ⋯ button on an ItemCard, this slides up:
┌─────────────────────────────────┐
│  📤 Share   🔖 Save   💬 WA   ✕ │  ← 4 quick actions (Share / Bookmark / WhatsApp / Close)
└─────────────────────────────────┘
Source: src/app/lost-found/page.tsx:6105-6170.
```

### Mobile Filter Panel (`showFilters === true`)
```
Expands below search bar (md:hidden). Renders MobileFilterPanel with same controls as desktop FilterSidebar.
Source: src/app/lost-found/page.tsx:5837-5849 (toggle button).
```

## Desktop (≥1024px) — subView='detail' (`<ItemDetail>`)

`src/app/lost-found/page.tsx:6023-6042` renders the detail subView. Single full-width column.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ◁ 🔍 Item Details                                              🔔 ◉                  🌓 │  ← Header (subtitle changes)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ◁ Back to List                                                                                                  │
│                                                                                                                  │
│ ┌── Two-column layout ──────────────────────────────────────────────────────────────────────────────────────┐    │
│ │ LEFT (image + details)                                  │ RIGHT (claim / verify / actions)               │    │
│ │ ┌── image (aspect-4/3, lightbox click) ──────────────┐ │ ┌────────────────────────────────────────────┐ │    │
│ │ │ [LOST] [Electronics]   🔖 (bookmark)               │ │ │ {isLost? CLAIM THIS ITEM : VERIFY OWNERSHIP}│ │    │
│ │ │ [image]                                              │ │ │                                            │ │    │
│ │ └──────────────────────────────────────────────────────┘ │ │ {isLost?                                  │ │    │
│ │                                                          │ │ │   [◉ Claim this item]                     │ │    │
│ │ Black Wallet                                  2h ago     │ │ │     → opens claim dialog (email input)    │ │    │
│ │ 📍 Cafeteria (Claim to reveal if found)                  │ │ │                                            │ │    │
│ │ 💬 Full description text…                                │ │ │ {isFound?                                 │ │    │
│ │                                                          │ │ │   [◉ Verify Ownership]                    │ │    │
│ │ Reported by: Anonymous (or name)                         │ │ │     → opens verify flow (photo upload)    │ │    │
│ │ Date: 2026-08-09                                         │ │ │                                            │ │    │
│ │                                                          │ │ │ {isReporter?                              │ │    │
│ │ ┌─ Location popup (click 📍) ─────────────────────────┐ │ │ │   [◉ Mark as Resolved]                    │ │    │
│ │ │ Found at: raw location text                         │ │ │ │     → resolve flow (resolution image)    │ │    │
│ │ │ Submitted to: handoff note                          │ │ │ │   [◉ Edit]    [◉ Delete]                  │ │    │
│ │ └─────────────────────────────────────────────────────┘ │ │ │ }                                          │ │    │
│ │                                                          │ │ │                                            │ │    │
│ │ ┌── Comments section ─────────────────────────────────┐ │ │ │ {isClaimant?                              │ │    │
│ │ │ 💬 Comments (3)                                     │ │ │ │   Your claim is verified ✓                │ │    │
│ │ │ User1: "I saw something similar…"                   │ │ │ │   [◉ Unclaim]                             │ │    │
│ │ │ User2: "Try contacting security"                    │ │ │ │ }                                          │ │    │
│ │ │ [Add a comment…]              [Post]                │ │ │ │                                            │ │    │
│ │ └─────────────────────────────────────────────────────┘ │ │ │ Was this helpful? 👍 👎                    │ │    │
│ │                                                          │ │ └────────────────────────────────────────────┘ │    │
│ │ ┌── Similar Items ────────────────────────────────────┐ │                                                │    │
│ │ │ [Card] [Card] [Card]  (horizontal scroll)          │ │                                                │    │
│ │ └─────────────────────────────────────────────────────┘ │                                                │    │
│ └──────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Claim dialog (`claimDialogOpen === true`)
```
┌─────────────────────────────────────┐
│ Claim this item                     │
│ Enter your email to register a      │
│ claim. We'll match it against lost  │
│ reports.                            │
│                                     │
│ [your@email.com_______________]     │
│                                     │
│ [Cancel]    [Submit Claim]          │
└─────────────────────────────────────┘
On submit: handleClaim(email) →
  1. POST /api/lost-found/claim/sync { foundItemId, claimerEmail }
     → if no match: toast 'Report Required', bail
  2. PATCH /api/lost-found/{id} { action: 'claim', claimerId, claimerEmail, lostItemId }
     → on success: localStorage 'lf-claimer-email' = email; reveal location; toast
Source: src/app/lost-found/page.tsx:2670-2740.
```

### Verify-and-resolve flow (`showVerifyFlow === true`)
```
Step 1: Upload possession photo
  ┌─────────────────────────────────────┐
  │ Verify Ownership                    │
  │ Upload a photo of the item in your  │
  │ possession. AI will match it        │
  │ against the original image.         │
  │                                     │
  │ [📷 Choose Photo]                   │
  │ [Cancel]    [Verify & Resolve]      │
  └─────────────────────────────────────┘

Step 2 (on submit): handleVerifyAndResolve()
  1. imageCompression(file, {maxSizeMB:0.5, maxWidthOrHeight:800})
  2. fileToBase64(compressed)
  3. POST /api/lost-found/verify { originalImageUrl, resolutionImageBase64, itemId, claimId }
     → returns { match, confidence, reasoning }
  4. if match && confidence >= 75:
       Upload resolution image to supabase.storage.from('lost_found_images')
       PATCH /api/lost-found/{id} { isResolved: true, resolvedBy, resolutionImageUrl }
       → onResolve callback → fetchItems + handleViewResolution(itemId)
       → subView='resolution'
  5. else: toast 'Verification failed (confidence X%)'
Source: src/app/lost-found/page.tsx:2740+ (ItemDetail).
```

## Desktop (≥1024px) — subView='report' (`<ReportForm>` 4-step wizard)

`src/app/lost-found/page.tsx:6071-6103` renders the report subView.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ◁ 🔍 Report Item                                               🔔 ◉                  🌓 │  ← Header
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ REPORT ITEM                                                                                                     │
│ Help the community                                                                                              │
│                                                                                                                  │
│ ┌── Step indicator (1 ●—● 2 ●—● 3 ●—● 4) ────────────────────────────────────────────────────────────────┐       │
│ │  Type  →  Category  →  Details  →  Contact                                                            │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│ ┌── Step 1: Type ───────────────────────────────────────────────────────────────────────────────────────┐       │
│ │  ◉ I LOST something                ◉ I FOUND something                                               │       │
│ │  [Lost item icon]                  [Found item icon]                                                 │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│ ┌── Step 2: Category ───────────────────────────────────────────────────────────────────────────────────┐       │
│ │  💻 Electronics    📄 Documents    ⌚ Accessories    👕 Clothing    🔑 Keys    👜 Bags    📚 Books   📦 Other│       │
│ │  (8 category tiles, click to select)                                                                  │       │
│ │  Examples: "Phone, AirBuds, Laptop, Charger"                                                          │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│ ┌── Step 3: Details ────────────────────────────────────────────────────────────────────────────────────┐       │
│ │  Title:         [Black leather wallet_____________________]                                            │       │
│ │  Description:   [textarea: Lost near cafeteria, contains ID card…____]                                │       │
│ │  Date:          [2026-08-09]                                                                          │       │
│ │  {type=found}:                                                                                         │       │
│ │    Found at:        [Cafeteria_______________] (AI parses → parsedFoundAt)                             │       │
│ │    Submitted to:    [Security Office________] (AI parses → parsedSubmittedAt)                          │       │
│ │    Image:           [📷 Choose Photo] (MANDATORY for found items)                                      │       │
│ │  {type=lost}:                                                                                          │       │
│ │    Last seen at:    [Cafeteria_______________] (optional, AI parses)                                   │       │
│ │    Image:           [📷 Choose Photo] (optional)                                                       │       │
│ │  {duplicateWarning?}                                                                                   │       │
│ │    ⚠️ Similar item already reported: "Black wallet" (2h ago). View it?                                 │       │
│ │  Urgent: ☐ Mark as urgent (visible pulsing badge)                                                     │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│ ┌── Step 4: Contact ────────────────────────────────────────────────────────────────────────────────────┐       │
│ │  {type=lost, MANDATORY}:                                                                               │       │
│ │    Email:          [i231234@isb.nu.edu.pk___] (validated via regex)                                    │       │
│ │    Reporter name:  [Optional_____________]                                                             │       │
│ │  {type=found}:                                                                                         │       │
│ │    Contact:       [Optional_____________]                                                              │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│       [Cancel]                                              [Submit Report]                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Submit flow
```
handleSubmit():
  1. validate() — set errors if title<3, desc<5, found needs location+handoff+image, lost needs valid email
  2. {type=found} OR {type=lost with location}:
       POST /api/lost-found/handoff { foundAt, handedOffTo }
       → AI parses free-text location → returns parsedFoundAt + parsedSubmittedAt
  3. {imageFile}:
       imageCompression(file, {maxSizeMB:1, maxWidthOrHeight:1200})
       supabase.storage.from('lost_found_images').upload(filePath, compressedFile)
       finalImageUrl = publicUrl
  4. onSubmit({ type, category, title, description, location: finalLocation, handoffNote, parsedFoundAt,
                parsedSubmittedAt, rawFoundAt, rawSubmittedAt, date, contactInfo, reporterName, imageUrl })
     → handleCreateItem → POST /api/lost-found
       → on success: addMyReportedItem(id); setUrgentItem if pending-urgent; onSubViewChange('list'); fetchItems()
  5. setSubmitted(true); toast 'Item reported!'
  6. setTimeout 1200ms → onSuccess()
Source: src/app/lost-found/page.tsx:1800-1900.
```

## Desktop (≥1024px) — subView='history' (`<ResolvedHistory>`)

`src/app/lost-found/page.tsx:6009-6021` renders the history subView.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ◁ 🔍 Resolved History                                          🔔 ◉                  🌓 │  ← Header
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Resolved History                                                                                                │
│ Success stories of recovered items on campus.                                                                   │
│                                                                                                                  │
│ ┌── Resolved items grid ─────────────────────────────────────────────────────────────────────────────────┐       │
│ │ ┌────────┬────────┬────────┐                                                                         │       │
│ │ │ ◉ Card │ ◉ Card │ ◉ Card │  ← resolved items shown with green ✅ badge                              │       │
│ │ └────────┴────────┴────────┘                                                                         │       │
│ │ …                                                                                                     │       │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│ Click any card → handleViewResolution(itemId) → subView='resolution'                                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Desktop (≥1024px) — subView='resolution' (`<ResolutionDetail>`)

`src/app/lost-found/page.tsx:6044-6069` renders the resolution subView.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ◁ 🔍 Resolved History                                          🔔 ◉                  🌓 │  ← Header
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ◁ Back to History                                                                                               │
│                                                                                                                  │
│ ┌── Resolution Pair (found item + lost item + claim) ──────────────────────────────────────────────────────┐    │
│ │                                                                                                          │    │
│ │   ╔════════════════════════════════════════════════════════════════════════════════════════════════╗    │    │
│ │   ║  🎉 REUNITED!                                                                                  ║    │    │
│ │   ║                                                                                                  ║    │    │
│ │   ║  ┌── Found Item ────────┐    ┌── Lost Item ────────┐                                            ║    │    │
│ │   ║  │ [image]              │    │ [image]              │                                            ║    │    │
│ │   ║  │ Black Wallet         │    │ Black Wallet         │                                            ║    │    │
│ │   ║  │ Found @ Cafeteria    │    │ Reported by i231234  │                                            ║    │    │
│ │   ║  └──────────────────────┘    └──────────────────────┘                                            ║    │    │
│ │   ║                                                                                                  ║    │    │
│ │   ║  ┌── Claim Details ───────────────────────────────────────────────────────────────────────────┐ ║    │    │
│ │   ║  │ Claimer: i231234@isb.nu.edu.pk                                                            │ ║    │    │
│ │   ║  │ Status: verified                                                                            │ ║    │    │
│ │   ║  │ AI Verification: 92% match                                                                  │ ║    │    │
│ │   ║  │ Resolved at: 2026-08-09 14:32                                                               │ ║    │    │
│ │   ║  └────────────────────────────────────────────────────────────────────────────────────────────┘ ║    │    │
│ │   ╚════════════════════════════════════════════════════════════════════════════════════════════════╝    │    │
│ └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Loading state (`loadingResolution === true`)
```
        ↻ (spinning Loader2)
   Retrieving reunion success story...
Source: src/app/lost-found/page.tsx:6044-6051.
```

### Resolution-pair fetch failed
```
Resolution pair details not found.
[Back to History]   ← button → onSubViewChange('history')
Source: src/app/lost-found/page.tsx:6061-6069.
```

## Major Modals

### OnboardingBanner (`showOnboarding === true`) — `src/app/lost-found/page.tsx:1046-1148`
```
Top of list view, above stats dashboard. Carousel of 3 tips (auto-advancing):
┌──────────────────────────────────────────────────────────────┐
│ 👋 Welcome to Lost & Found!                                  │
│ Report lost items or help return found belongings…           │
│                                                              │
│  ◁  📸 Add photos for faster recovery                  ▷     │
│     (Tip 1/3)                                                │
│                                                              │
│  ●  ○  ○                                                    │  ← dot indicators
│  [× Dismiss]                                                 │
└──────────────────────────────────────────────────────────────┘
Triggered on first visit (lf-onboarded localStorage key missing).
Dismiss → setOnboarded() (writes localStorage lf-onboarded=true).
```

### VerifyHoldDialog (`showVerifyHoldDialog === true`) — `src/app/lost-found/page.tsx:1499-1728`
```
Auto-opens when URL has ?verifyClaimId=X (from email verification links).
Centered modal (z-50):
┌──────────────────────────────────────────┐
│ Verify Item Retrieval                    │
│                                          │
│ ┌── Claim details (fetched) ───────────┐ │
│ │ Item: [image] Black Wallet           │ │
│ │ Claimer: i231234@isb.nu.edu.pk       │ │
│ │ Status: pending                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Upload a live photo of the item in your  │
│ possession to verify retrieval:          │
│                                          │
│ [📷 Choose Photo]                        │
│                                          │
│ [Cancel]    [Verify & Resolve]           │
└──────────────────────────────────────────┘
On verify: handleVerifyCollection() — same flow as ItemDetail.verifyAndResolve.
  1. imageCompression + fileToBase64
  2. POST /api/lost-found/verify { originalImageUrl, resolutionImageBase64, itemId, claimId }
  3. if match && confidence>=75: upload resolution image; POST /api/lost-found/claim/verify-hold { claimId }
     → onResolutionCompleted(itemId) → fetchItems + handleViewResolution(itemId)
Source: src/app/lost-found/page.tsx:1499-1728.
```

### UnclaimConfirmDialog (`unclaimConfirmOpen === true`) — `src/app/lost-found/page.tsx:1414-1498`
```
AlertDialog modal:
┌──────────────────────────────────────────┐
│ Unclaim Item?                            │
│                                          │
│ Are you sure you want to remove your     │
│ claim on "Black Wallet"? You'll lose     │
│ access to location details.              │
│                                          │
│ [Cancel]    [Yes, Unclaim]               │
└──────────────────────────────────────────┘
On confirm: handleUnclaim(claimId) → POST /api/lost-found/claim/unclaim { claimId }
  → on success: toast 'Claim Removed'; fetchClaims()
Source: src/app/lost-found/page.tsx:1414-1498.
```

### QuickSearchModal (`searchModalOpen === true`) — `src/app/lost-found/page.tsx:4119-4274`
```
Triggered by Cmd/Ctrl+K keyboard shortcut.
Centered modal (z-60), pt-[15vh]:
┌──────────────────────────────────────────────────────┐
│ 🔍 [Search items by title, location, category…]   ✕  │
├──────────────────────────────────────────────────────┤
│ Top Results (8):                                     │
│ ┌────────────────────────────────────────────────┐   │
│ │ 📦 Black Wallet           LOST · Cafeteria    │   │
│ │ 2h ago                                          │   │
│ ├────────────────────────────────────────────────┤   │
│ │ 📱 iPhone 13              FOUND · Library     │   │
│ │ 5h ago                                          │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
Click any result → setSearchSelectedItemId(id) → autoSelectItemId prop → LostFoundView opens detail.
Source: src/app/lost-found/page.tsx:4119-4274.
```

### Claimer Email Prompt Dialog (`claimerEmailPromptOpen === true`) — `src/app/lost-found/page.tsx:6172-6214`
```
Triggered when user clicks "My Claims" filter checkbox in FilterSidebar without stored email.
AlertDialog:
┌──────────────────────────────────────────┐
│ Load My Claims                           │
│ To view all the active claims you have   │
│ registered, please enter your email.     │
│                                          │
│ [your@email.com_______________]          │
│                                          │
│ [Cancel]    [Load Claims]                │
└──────────────────────────────────────────┘
On confirm (validated):
  localStorage.setItem('lf-claimer-email', email)
  setStoredClaimerEmail(email)
  fetchUserClaims(email) → GET /api/lost-found/claim/user-claims?email=X
  setShowMyClaims(true)
Source: src/app/lost-found/page.tsx:6172-6214.
```

### NotificationBell dropdown (`showNotifications === true`) — `src/app/lost-found/page.tsx:6225-6423`
```
Click 🔔 icon in header right actions:
Desktop (absolute right-0 top-10 w-72):
  ┌──────────────────────────────────────┐
  │ 🔔 Campus Updates            Clear   │
  ├──────────────────────────────────────┤
  │ 📱 New lost item: Black Wallet       │  ← unread = lf-bg
  │    2h ago                       •    │
  ├──────────────────────────────────────┤
  │ ✅ Item reunited: iPhone 13          │
  │    5h ago                            │
  └──────────────────────────────────────┘

Mobile (fixed right-0 top-0 bottom-0 w-[85%] max-w-sm):
  Full-screen drawer with backdrop.
Source: src/app/lost-found/page.tsx:6225-6423.
```

## Key Interactive Elements (annotated)

### Page-shell level
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `handleBack` | If subView !== 'list': setSubView('list'); else router.push('/') | `src/app/lost-found/page.tsx:6440-6447` |
| NotificationBell button | `() => setShowNotifications(!showNotifications); markNotificationsRead()` | Opens dropdown; clears unread badge | `src/app/lost-found/page.tsx:6234-6244` |
| NotificationBell "Clear" | `() => { localStorage.removeItem('lf-notifications'); setNotifications([]) }` | Clears all notifications | `src/app/lost-found/page.tsx:6295-6300` |
| NotificationBell close ✕ (mobile) | `() => setShowNotifications(false)` | Closes drawer | `src/app/lost-found/page.tsx:6306-6310` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

### List subView
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| "History" button | `() => onSubViewChange('history')` | Switches to history subView | `src/app/lost-found/page.tsx:5773-5780` |
| "Report an Item" button (top right) | `() => { onSubViewChange('report'); window.scrollTo({top:0}) }` | Switches to report subView | `src/app/lost-found/page.tsx:5781-5789` |
| "Report an Item" button (desktop shimmer) | `() => onSubViewChange('report')` | Same | `src/app/lost-found/page.tsx:5869-5878` |
| "Report an Item" sticky pill (mobile) | `() => onSubViewChange('report')` | Same | `src/app/lost-found/page.tsx:5881-5895` |
| Search input | `(e) => setSearchQuery(e.target.value)` | Free-text filter (debounced 500ms); triggers smart search if 0 local results | `src/app/lost-found/page.tsx:5822-5826` |
| Search clear ✕ | `() => setSearchQuery('')` | Clears search | `src/app/lost-found/page.tsx:5827-5831` |
| Mobile "Filters" button | `() => setShowFilters(!showFilters)` | Toggles MobileFilterPanel | `src/app/lost-found/page.tsx:5833-5850` |
| StatsDashboard card | `onFilterChange(type, range)` → `setTypeFilter` + `setDateRange` + `setShowFilters(true)` | Pre-filters by clicked stat | `src/app/lost-found/page.tsx:5790-5803` |
| FilterSidebar type button | `setTypeFilter(t)` | Sets 'all' / 'lost' / 'found' | (FilterSidebar line 3639+) |
| FilterSidebar category button | `setCategoryFilter(c)` | Sets 'All' / 'Electronics' / etc. | (FilterSidebar) |
| FilterSidebar sort `<select>` | `setSortBy(s)` | Sets 'newest' / 'oldest' / 'recently-lost' / 'recently-found' | (FilterSidebar) |
| FilterSidebar date-range button | `setDateRange(d)` | Sets 'all' / 'today' / 'week' / 'month' | (FilterSidebar) |
| FilterSidebar "My Reports" checkbox | `setShowMyReports(v)` | Toggles filter to lf-my-reports | (FilterSidebar) |
| FilterSidebar "Bookmarked" checkbox | `setShowBookmarked(v)` | Toggles filter to lf-bookmarks | (FilterSidebar) |
| FilterSidebar "My Claims" checkbox | `setShowMyClaims(v)` → if no email, `setClaimerEmailPromptOpen(true)` | Toggles filter to user's claimed items | (FilterSidebar) |
| FilterSidebar "Clear Filters" | `onClearFilters` → `handleClearFilters` | Resets all filters to defaults | (FilterSidebar) |
| FilterSidebar "Share Summary" | `onShareSummary` → `handleShareSummary` | Generates shareable text summary | (FilterSidebar) |
| `<ItemCard onClick>` | `() => openDetail(item)` → `setSelectedItem(item)` + `addRecentlyViewed(id)` + `onSubViewChange('detail')` | Opens detail subView | `src/app/lost-found/page.tsx:6057-6063, 5961-5966` |
| ItemCard bookmark button | `(e) => { e.stopPropagation(); onToggleBookmark(e, item.id) }` → `handleToggleBookmark` | Adds/removes from lf-bookmarks localStorage | `src/app/lost-found/page.tsx:1186-1190` |
| ItemCard share button | `onShare` → `handleShareItem` | Opens native share or copies link | (ItemCard) |
| ItemCard quick-action ⋯ button | `onQuickAction('share'\|'bookmark', item)` → `handleQuickAction` | Triggers quick action OR sets selectedQuickActionItem | (ItemCard) |
| ItemCard location filter button | `onLocationFilter(zone)` → `handleLocationFilter` | Sets `locationZoneFilter` to clicked zone | (ItemCard) |
| Mobile Quick Action Bar Share | `handleQuickAction('share', selectedQuickActionItem)` | Shares selected item | `src/app/lost-found/page.tsx:6112-6117` |
| Mobile Quick Action Bar Bookmark | `handleQuickAction('bookmark', selectedQuickActionItem)` | Toggles bookmark | `src/app/lost-found/page.tsx:6118-6124` |
| Mobile Quick Action Bar WhatsApp | `window.open(https://wa.me/?text=…)` | Opens WhatsApp share | `src/app/lost-found/page.tsx:6125-6135` |
| Mobile Quick Action Bar Close | `setSelectedQuickActionItem(null)` | Dismisses bar | `src/app/lost-found/page.tsx:6136-6142` |
| Recently-viewed carousel card (mobile) | `() => openDetail(item)` | Opens detail | `src/app/lost-found/page.tsx:5928-5948` |

### Detail subView
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back button | `() => { onSubViewChange('list'); window.scrollTo({top:0}) }` | Returns to list | `src/app/lost-found/page.tsx:6026-6028` |
| Image lightbox click | `() => setLightboxOpen(true)` | Opens fullscreen image viewer | (ItemDetail) |
| Bookmark button | `onToggleBookmark(item.id)` → `handleToggleBookmarkDetail` | Toggles bookmark | (ItemDetail) |
| "Claim this item" button (lost items) | `() => setClaimDialogOpen(true)` | Opens claim dialog | (ItemDetail) |
| Claim dialog email submit | `handleClaim(email)` | POST /api/lost-found/claim/sync + PATCH /api/lost-found/{id} | `src/app/lost-found/page.tsx:2670-2740` |
| "Verify Ownership" button (found items) | `() => setShowVerifyFlow(true)` | Opens verify flow | (ItemDetail) |
| Verify "Choose Photo" | `setVerificationImage(file)` | Selects possession photo | (ItemDetail) |
| Verify "Verify & Resolve" | `handleVerifyAndResolve()` | POST /api/lost-found/verify → if match, PATCH /api/lost-found/{id} → onResolve | (ItemDetail) |
| "Mark as Resolved" (reporter only) | `onResolve(id, resolutionImageUrl)` → `handleResolve` | PATCH /api/lost-found/{id} { isResolved: true } | `src/app/lost-found/page.tsx:6028-6031` |
| "Unclaim" button (claimant only) | `() => setUnclaimConfirmOpen(true)` | Opens UnclaimConfirmDialog | (ItemDetail) |
| UnclaimConfirmDialog confirm | `handleUnclaim(claimId)` | POST /api/lost-found/claim/unclaim | `src/app/lost-found/page.tsx:2742-2757` |
| Comment input + Post | `setCommentText` + postComment | Adds comment to lf-item-comments-{id} localStorage | (ItemDetail) |
| "Was this helpful? 👍/👎" | `setFeedback('helpful'\|'not-helpful')` + persist | Records feedback in lf-feedback localStorage | (ItemDetail) |
| Similar Items card click | `onNavigateItem(item)` → `handleNavigateSimilarItem` | Replaces selectedItem with clicked similar item | (ItemDetail) |
| Location popup trigger | `setShowFoundLocPopup(true)` / `setShowSubmittedLocPopup(true)` | Shows raw location text in popup | (ItemDetail) |

### Report subView
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Cancel button | `() => { onSubViewChange('list'); window.scrollTo({top:0}) }` | Returns to list | `src/app/lost-found/page.tsx:6091-6094` |
| Step 1 type button (Lost/Found) | `setType('lost'\|'found')` | Selects item type | (ReportForm line 1729+) |
| Step 2 category tile | `setCategory(cat)` | Selects category | (ReportForm) |
| Step 3 title input | `e => setTitle(e.target.value)` + `onCheckDuplicate(category, type, val)` | Sets title; checks for duplicates | (ReportForm) |
| Step 3 description textarea | `e => setDescription(e.target.value)` | Sets description | (ReportForm) |
| Step 3 date input | `e => setDate(e.target.value)` | Sets date | (ReportForm) |
| Step 3 found-at input (found only) | `e => setLocation(e.target.value)` | Sets raw location; AI parses on submit | (ReportForm) |
| Step 3 submitted-to input (found only) | `e => setHandoffNote(e.target.value)` | Sets raw handoff; AI parses on submit | (ReportForm) |
| Step 3 image picker | `e => setImageFile(file)` | Selects image (mandatory for found) | (ReportForm) |
| Step 3 urgent checkbox | `e => setUrgent(e.target.checked)` | Toggles urgent flag | (ReportForm) |
| Step 4 email input (lost only) | `e => setContactInfo(e.target.value)` | Sets email (validated) | (ReportForm) |
| Step 4 reporter-name input (lost only) | `e => setReporterName(e.target.value)` | Sets reporter name (optional) | (ReportForm) |
| Submit button | `handleSubmit(e)` | Full submit flow (see above) | (ReportForm line 1800-1900) |

### History subView
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Resolved item card | `onSelect(itemId)` → `handleViewResolution(itemId)` | GET /api/lost-found/{id}/resolution → setResolutionPair → onSubViewChange('resolution') | `src/app/lost-found/page.tsx:6009-6021, 4560-4590` |

### Resolution subView
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back button | `() => { onSubViewChange('history'); window.scrollTo({top:0}) }` | Returns to history | `src/app/lost-found/page.tsx:6057-6059` |
| "Back to History" (fallback) | `() => onSubViewChange('history')` | Same (when resolutionPair is null) | `src/app/lost-found/page.tsx:6066-6069` |

### Global keyboard shortcuts
| Key | Handler | Action | File:Line |
|-----|---------|--------|-----------|
| `Cmd/Ctrl+K` | `setSearchModalOpen(prev => !prev)` | Toggles QuickSearchModal | `src/app/lost-found/page.tsx:6478-6480` |
| `Escape` (when modal open) | `setSearchModalOpen(false)` | Closes QuickSearchModal | `src/app/lost-found/page.tsx:6481-6483` |
| `Escape` (when not in list) | `setSubView('list')` | Returns to list subView | `src/app/lost-found/page.tsx:6484-6486` |
| `ArrowDown` (in list, not in input) | `setFocusedItemIndex(prev+1)` | Highlights next item | `src/app/lost-found/page.tsx:4722-4724` |
| `ArrowUp` (in list, not in input) | `setFocusedItemIndex(prev-1)` | Highlights prev item | `src/app/lost-found/page.tsx:4725-4727` |
| `Enter` (when item focused) | `openDetail(currentItems[idx])` | Opens detail subView | `src/app/lost-found/page.tsx:4728-4731` |
| `Escape` (when item focused) | `setFocusedItemIndex(-1)` | Clears focus | `src/app/lost-found/page.tsx:4732-4733` |

## Conditional States

### `{loading && items.length === 0}` — Initial loading skeleton
```
3-6 SkeletonCard placeholders render in grid (shimmer animation).
Source: src/app/lost-found/page.tsx:5937-5941.
```

### `{activeItems.length === 0 && resolvedItems.length === 0 && !loading}` — Empty state
```
<EmptyState hasFilters={hasFilters} onReport={() => onSubViewChange('report')} />
Shows different message based on whether filters are active.
Source: src/app/lost-found/page.tsx:5942-5945.
```

### `{smartSearchLoading === true}` — Smart search spinner
```
When local search yields 0 results, after 800ms debounce:
  POST /api/smart-search { query, items }
  → if suggestions: render smartSearchResults panel above list
  → else: hide
Source: src/app/lost-found/page.tsx:4640-4670.
```

### `{duplicateWarning !== null}` — Report form duplicate warning
```
Above title input in report form:
  ⚠️ Similar item already reported: "Black wallet" (2h ago). View it?
Click "View it" → opens detail of the duplicate.
Triggered by checkDuplicate() on title change (Levenshtein distance + word overlap).
Source: src/app/lost-found/page.tsx:4672-4710.
```

### `{newItemCount > 0 && subView === 'list'}` — New items badge in header
```
Header subtitle shows orange badge with newItemCount next to "Lost & Found" label.
Polls GET /api/lost-found every 30s (src/app/lost-found/page.tsx:6454-6473).
Compares item.createdAt against localStorage 'lf-last-visit'.
```

### `{verifyClaimId !== null}` — Auto-open VerifyHoldDialog
```
On mount, if URL has ?verifyClaimId=X:
  setVerifyClaimId(X)
  setShowVerifyHoldDialog(true)
  window.history.replaceState to clean URL (no reload)
Source: src/app/lost-found/page.tsx:4466-4478.
```

### `{!isOnboarded()}` — Onboarding banner shown
```
First-time visitors see OnboardingBanner at top of list view.
localStorage 'lf-onboarded' missing → showOnboarding=true.
Dismiss → setOnboarded() writes localStorage 'lf-onboarded'=true.
Source: src/app/lost-found/page.tsx:1058-1148.
```

### `{isMobile && showNotifications}` — Mobile notification drawer
```
Mobile: full-screen right-side drawer (fixed right-0 top-0 bottom-0 w-[85%] max-w-sm)
Backdrop (z-100) + drawer (z-101) with slide-in-from-right animation.
Desktop: absolute right-0 top-10 w-72 dropdown.
Source: src/app/lost-found/page.tsx:6324-6332.
```

### 30-second polling
```
useEffect at src/app/lost-found/page.tsx:6454-6473 sets up:
  fetchCount() immediately + setInterval(fetchCount, 30000)
Each poll: GET /api/lost-found → compute newItemCount since lf-last-visit
Cleared on unmount.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | List view switches from 2-col mobile grid to desktop 2-col layout (sidebar w-56 + main flex-1). Mobile-only sticky bottom "Report an Item" pill hides (`md:hidden fixed bottom-4`). Desktop-only shimmer "Report an Item" button appears (`hidden md:inline-flex`). Mobile-only "Filters" button hides. Recently-viewed carousel hides on desktop. Mobile Quick Action Bar hides (`md:hidden`). | `src/app/lost-found/page.tsx:5869,5881,5896,5900,6105` |
| `lg:` (1024px) | No structural change for lost-found (page already centers max-w-5xl). | `src/app/lost-found/page.tsx:6434` |
| `sm:` (640px) | Search bar + Filters button row switches from `flex-col sm:flex-row`. | `src/app/lost-found/page.tsx:5811` |
| `<ItemDetail>` responsive | Two-column on desktop (image+details LEFT, actions RIGHT); single-column stack on mobile. Similar Items carousel always horizontal. | (ItemDetail line 2490+) |
| `<VerifyHoldDialog>` modal | Centered modal on all sizes (z-50, max-w-md mx-auto). | `src/app/lost-found/page.tsx:1499-1728` |
| `<NotificationBell>` dropdown | Desktop: absolute w-72 dropdown. Mobile: fixed full-height right-side drawer w-[85%] max-w-sm. | `src/app/lost-found/page.tsx:6324-6332` |
| `<QuickSearchModal>` | Centered modal (z-60, max-w-lg, mx-4). pt-[15vh] on all sizes. | `src/app/lost-found/page.tsx:4127-4141` |
| `<OnboardingBanner>` | Full-width banner above stats; same layout on all sizes. | `src/app/lost-found/page.tsx:1046-1148` |

## Screenshot References

- Desktop list view: `[screenshot: desktop/11-lost-found.png]`
- Desktop report form: `[screenshot: desktop/11b-lost-found-report.png]`
- Desktop item detail: `[screenshot: desktop/11c-lost-found-item-detail.png]`
- Mobile list view: `[screenshot: mobile/11-lost-found.png]`

## State Transitions

### SubView state machine (all under same `/lost-found` route)

```
                     ┌──────────────────────────┐
                     │       list (default)      │
                     └────────────┬─────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
   click "Report an Item"   click item card         click "History"
            │                       │                       │
            ▼                       ▼                       ▼
   ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
   │    report       │      │    detail       │      │    history     │
   │ (4-step wizard)│      │ (single item)  │      │ (resolved grid)│
   └────────┬───────┘      └────────┬───────┘      └────────┬───────┘
            │                       │                       │
   CANCEL / Submit         click "View Resolution"   click resolved card
            │                       │                       │
            └──────► list ◄─────────┘                       │
                                    │                       │
                                    │                       ▼
                                    │               ┌────────────────┐
                                    │               │  resolution    │
                                    │               │ (matched pair) │
                                    │               └────────┬───────┘
                                    │                        │
                                    │               "Back to History"
                                    │                        │
                                    └──────► list ◄──────────┘

Special transitions:
  - URL ?verifyClaimId=X ──► list + VerifyHoldDialog auto-opens
  - Cmd/Ctrl+K (anywhere) ──► QuickSearchModal opens (no subView change)
  - Escape (when not in list, no modal) ──► setSubView('list')
  - Escape (when modal open) ──► close modal (priority over subView reset)
  - Escape (when item focused in list) ──► setFocusedItemIndex(-1)
  - Arrow keys (in list, not in input) ──► navigate items
  - Enter (when item focused) ──► openDetail(currentItems[idx]) → detail
```

### Polling + notification pipeline

```
Mount (src/app/lost-found/page.tsx:6454-6473):
  fetchCount() immediately + setInterval(fetchCount, 30000)
  Each poll:
    GET /api/lost-found → items
    lastVisit = getLastVisit()  (lf-last-visit localStorage)
    newItemCount = items.filter(!isResolved && createdAt > lastVisit).length
    setNewItemCount(newCount)

When user actually opens list subView (src/app/lost-found/page.tsx:4596-4640):
  fetchItems() → GET /api/lost-found?type=X&category=Y&search=Z
  Compare against lastVisit:
    New items → addNotification({ type: 'new_item', text, timestamp, read: false })
    Resolved items → addNotification({ type: 'resolved', text, ... })
  setLastVisit(Date.now())

When NotificationBell opens:
  markNotificationsRead() → lf-notifications localStorage all .read=true
  setUnreadCount(0)
```

### VerifyHoldDialog auto-trigger

```
URL: /lost-found?verifyClaimId=abc-123
  └─ useEffect (src/app/lost-found/page.tsx:4466-4478):
       setVerifyClaimId('abc-123')
       setShowVerifyHoldDialog(true)
       window.history.replaceState({}, '', '/lost-found')  ← cleans URL

  └─ VerifyHoldDialog mounts:
       GET /api/lost-found/claim/details?claimId=abc-123 → setClaim(data.claim)
       if claim.claimerEmail:
         localStorage.setItem('lf-claimer-email', claim.claimerEmail)
         onClaimerEmailEstablished(claim.claimerEmail)

  └─ User uploads photo + clicks "Verify & Resolve":
       handleVerifyCollection():
         1. imageCompression + fileToBase64
         2. POST /api/lost-found/verify { originalImageUrl, resolutionImageBase64, itemId, claimId }
         3. if match && confidence>=75:
              supabase.storage.from('lost_found_images').upload(resolved-..., compressed)
              POST /api/lost-found/claim/verify-hold { claimId }
              onResolutionCompleted(itemId) → fetchItems + handleViewResolution(itemId) → subView='resolution'
         4. else: toast 'Verification failed'
```

### ItemClaim flow (detail → resolution)

```
User clicks "Claim this item" on a LOST item:
  setClaimDialogOpen(true) → claim dialog opens
  User enters email + clicks "Submit Claim":
    handleClaim(email):
      1. POST /api/lost-found/claim/sync { foundItemId, claimerEmail }
         → if !match: toast 'Report Required' (must report lost first); return
      2. PATCH /api/lost-found/{id} { action: 'claim', claimerId, claimerEmail, lostItemId: syncData.matchId }
         → on 200: localStorage 'lf-claimer-email' = email; setHumbleMessageVisible(true);
                  setSessionClaimVerified(true); toast 'Claim Linked!'; fetchClaims()
         → on 400 'already registered a pending claim':
                  same as success (treat as connected); toast 'Claim Connected!'
         → else: toast 'Claim Failed'

User clicks "Verify Ownership" on a FOUND item (claimant):
  setShowVerifyFlow(true) → photo upload UI appears
  User uploads photo + clicks "Verify & Resolve":
    handleVerifyAndResolve():
      1. imageCompression + fileToBase64
      2. POST /api/lost-found/verify { originalImageUrl, resolutionImageBase64, itemId, claimId }
      3. if match && confidence>=75:
           supabase.storage.from('lost_found_images').upload(resolved-...)
           PATCH /api/lost-found/{id} { isResolved: true, resolvedBy, resolutionImageUrl }
           → onResolve(id, resolutionImageUrl) → fetchItems + handleViewResolution(id)
           → subView='resolution'
      4. else: toast 'Verification failed (confidence X%)'

Reporter clicks "Mark as Resolved":
  onResolve(id, resolutionImageUrl?) → handleResolve(id, resolutionImageUrl):
    PATCH /api/lost-found/{id} { isResolved: true, resolvedBy: lf-user-id, resolutionImageUrl }
    → on success: toast; fetchItems; (no auto-navigation)
```

### URL parameter contract

```
Optional: ?verifyClaimId={UUID}
  - Read via useSearchParams() inside Suspense-wrapped LostFoundView (line 4459-4478)
  - Auto-opens VerifyHoldDialog on mount
  - URL is cleaned (replaceState) after dialog opens — no history entry

No other URL params. All other state is React-internal (subView, selectedItem, etc.)
```
