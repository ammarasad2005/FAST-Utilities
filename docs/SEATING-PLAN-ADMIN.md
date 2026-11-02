# Manual seating-plan import

The authenticated `/admin` portal now has a **Seating Plan Import** tab.

1. The admin selects one PDF (1 KB–9 MB).
2. PDF.js extracts and parses it in the browser. The plan date must be read from the printed PDF date; missing/mixed dates or malformed rows are rejected.
3. The admin reviews a sample distributed across the parsed assignments and explicitly confirms the import.
4. Only structured assignment fields are sent through the authenticated Next.js route. The PDF bytes and student names are not uploaded or retained. The server forwards the payload to the private `seating-plan-import` Edge Function.
5. A single PostgreSQL RPC transaction replaces the active day. Validation or storage failures leave the previous plan intact.

## Server configuration

The Next.js deployment needs the server-only environment variable `SEATING_MANUAL_IMPORT_TOKEN`, set to the same dedicated secret configured for the Supabase import Edge Function. Do not expose it as a `NEXT_PUBLIC_*` variable. The route also uses the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values to reach the Edge Function; the service-role key stays inside Supabase.

The parser was tested against today’s real 172-page plan (printed date 2026-11-02): it extracted 5,632 assignments with no duplicate assignment keys and a 2.3 MB structured payload. This was a parser-only test; nothing was imported into Supabase. Review the distributed sample in the admin preview before the first live import.
