# GPC Care product requirements

GPC Care helps Gospel Providence Church care for roughly 60–70 people and manage its directory and attendance. The MVP serves one elder, one pastor and two staff members using individual, approved Gmail identities.

## Phase 0 findings

The existing app uses Node 24, SQLite, cookie sessions and a responsive plain JavaScript PWA with GSAP. SQLite stores a versioned JSON state document and separate sessions. The API exposes shared state to configured administrators. The local checkout has existing uncommitted changes. The default terminal uses Node 23.11.0, below the declared runtime requirement. This audit was static.

Reuse the visual design, responsive shell, directory and attendance controls, forms, fictional seed data, manifest, and service-worker push behavior. Adapt the data access layer and reminder logic. The existing all-admin state API cannot deliver caregiver privacy or staff authorization. Existing automatic missed-service follow-ups are deferred under the new scope and should be disabled in the new MVP. Existing Telegram fallback is a scope decision.

## MVP requirements

- **Access and navigation.** Supabase Auth with approved Gmail identities. Elder and pastor share administrative member and attendance access, record their own care, and see combined care metadata. Staff maintain member information, events and attendance and handle administrative imports and exports. Staff cannot read pastoral records. Home, People, Pastoral Care, Attendance and Settings adapt to the signed-in role. Enforce access in the API and database.
- **People.** Search, filter, sort and open incomplete profiles. Store full name, nickname, photo, birthday, gender, phone, email, address and area, occupation and workplace, interests, background, marital status, spouse, children and other family relationships, Care Group, first visit and membership dates. Membership statuses are Newcomer / Visitor, Regular Attendee, Potential Member, Official Member and Inactive. Status changes are manual.
- **Pastoral interactions.** Record date, caregiver, one or more participating members, type, meaningful-contact flag, private notes and optional private follow-up and reminder. Types include lunch or dinner, coffee, phone, personal meeting, WhatsApp, conversation after service, birthday greeting, brief check-in and other. Phone and meals default to meaningful. Others need an explicit override. Other caregivers see participants and shared coverage metadata tied to their member records, with date, caregiver, type and classification. Notes, follow-up details and personal reminders are owner-only. Show last meaningful contact, last interaction, personal next follow-up, and personal and combined contact timelines.
- **Pastoral dashboard.** Personal and combined views with accessible clickable member indicators for recent, stale and missing contact, meaningful-contact coverage, birthdays and the viewer's overdue and upcoming follow-ups. Filter by status, Care Group, caregiver and time since contact. Make thresholds configurable. Combined coverage cannot disclose another caregiver's reminders.
- **Home.** Elder and pastor see congregation overview, today's birthdays, personal follow-ups, coverage, recent interactions and attendance. Staff see totals, recent attendance, upcoming birthdays, newcomers, quick attendance entry and administrative shortcuts.
- **Attendance and groups.** Dated sessions for Sunday Worship, Care Group, Prayer Meeting, Bible Study, Discipleship, Ministry Meeting and Special Event, with custom types if practical. Support searchable bulk entry, corrections, historical views, summaries and member histories. Attendance is present or absent after recording, with unrecorded distinguished from finalized absence. Support unregistered visitors and linking or promoting them without duplication. Named Care Groups have separate membership and meeting histories.
- **Reminders.** Device-level Web Push subscriptions associated with authenticated users. Birthdays at 07:00 Asia/Jakarta on the birthday. Weekly briefing at 07:00, with Monday as a configurable proposed default, covering birthdays, overdue and upcoming personal follow-ups, stale meaningful contact and personal and combined coverage. Complete, snooze or reschedule follow-ups. Lock-screen copy is generic.
- **Import/export.** Member and historical attendance Excel import with preview, mapping, matching, duplicate detection and validation before writes. Excel and Google Sheets exports. Keep caregiver-owned pastoral export separate from administrative export. After migration, GPC Care is the source of truth. Source sheets will determine concrete mappings.
- **ChatGPT.** Use the elder's existing account for natural English and Bahasa Indonesia read and write workflows. Test with fictional data before selecting an integration. Required operations are search_members, get_member_profile, get_interaction_history, record_interaction, get_overdue_followups, get_care_coverage, create_reminder, update_reminder, get_birthdays, get_attendance, record_attendance and update_member. Require authenticated identity, scoped data access, and explicit confirmation for ambiguous or destructive updates. Verify desktop/web, mobile and Live voice independently.
- **Design and operations.** Warm, readable, mobile-first UI with photos, fast forms and clear privacy cues. Target Rp0/month incremental cost. Use private photo storage, audit metadata, validated inputs, secret management, encrypted backups and tested restores. Offline records are low priority. Development and AI tests use fictional data.

## Architecture

Keep the existing PWA and serve it via Cloudflare Workers Static Assets. Use Supabase Postgres, Auth and private Storage. Separate interaction metadata, participants, owner-only notes and reminders into distinct tables with RLS. Use stable user IDs from verified identities, an approved-account role table and explicit default-deny policies. Keep privileged credentials in server secrets. Use user-scoped database access for human and integration requests. Store event sessions, attendance, visitors, Care Groups and member relationships separately. Use transactional writes for attendance finalization and visitor conversion.

A Cloudflare scheduled Worker claims reminders from a database outbox and sends generic Web Push with VAPID. Track retries and per-device delivery attempts. Use UTC scheduling with Jakarta calendar rules. Test the sender under free Worker CPU and subrequest limits before committing to production deployment.

Future work includes shared pastoral notes, staff care workspaces, prayer requests and answers, life events, absence alerts, ministry commitments and scheduling, and formal offboarding and retention policies.

## Decisions to confirm

- Who can export administrative data, and whether Google Sheets export means creating a native Sheet or providing a file for import.
- Initial contact thresholds and coverage denominator, birthday recipients and leap-day behavior, and weekly briefing default.
- Role assignments, approved Gmail addresses, Care Group membership rules and existing data ownership/status mapping.
- Whether Telegram fallback remains needed and whether a ChatGPT integration with fewer supported surfaces would satisfy the requirement.
- Whether confidential pastoral notes may ever be returned to ChatGPT, and who approves production integration and backup/retention arrangements.
