# GPC Care implementation roadmap

## 0. Inspect the base application — complete by static review

Audited package configuration, source, existing UI entry points, README, authentication, storage and notifications. Preserve the dirty checkout and use Node 24 for a runtime smoke test before modifying the application. Baseline sign-in, directory, attendance, follow-ups, service worker and push behavior using a disposable fictional database.

## 1. Verify ChatGPT feasibility — documentation review complete, account test pending

As of 21 November 2026, OpenAI documents that personal Plus cannot create new custom GPTs. Direct custom MCP has workspace limitations and its setup guide lists mobile as unsupported. OpenAI also documents that a plugin with an app hosted on ChatGPT Sites can be created on any plan. Treat the Sites-hosted route as the first candidate for the elder's account. Check whether its tools can securely use a narrow GPC Care endpoint backed by the same identity-aware authorization as the website. Availability and eligibility alone do not establish identity delegation or functional writes.

- [Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)
- [Connecting custom MCP servers](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
- [Plugins in ChatGPT](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt)
- [Live voice and plugin approvals](https://help.openai.com/en/articles/20001274-chatgpt-voice)

With the elder's authenticated account and an authorized fictional sandbox, build a minimal search and reminder-write proof of concept. Include two fictional caregivers, a staff identity and a duplicate name. Verify role scope, cross-caregiver denial, ambiguity handling, write confirmation, logout and token expiry. Exercise English and Bahasa Indonesia. Record independent pass/fail outcomes on desktop web, iOS/Android as applicable, and Live voice with on-screen approval. Confirm successful writes in the sandbox directly. If the account or surface cannot support this flow, report the limitation and obtain a scope decision before committing to an integration. Keep confidential data out of the test.

## 2. Database, authentication and privacy

Create migrations for identities, directory, relationships, Care Groups, sessions, attendance, visitors, pastoral metadata, owners' private records, devices, notification outbox and auditing. Configure Google OAuth and invite/allowlist checks for the four users. Validate database policies through direct API requests as elder, pastor, staff and unauthenticated users, including private files, joins and exports. Establish backup and restore procedures before importing data.

## 3. Directory and profiles

Adapt existing forms and directory to Supabase-backed records, named groups, incomplete profiles and private photo storage. Test partial records, family relations, search, sorting and manual status updates. Prepare a repeatable dry-run migration with ID mapping and duplicate reports.

## 4. Pastoral care

Add multi-person interactions, meaningful-contact defaults, owner-only notes and follow-ups, and personal and combined coverage. Verify owner isolation across reads, writes, summaries and export. Test complete, snooze and reschedule, with no leakage from combined views.

## 5. Attendance and groups

Build dated sessions, group rosters, bulk entry, explicit finalization, visitor linking and attendance history. Test draft vs absence, corrections and idempotent visitor promotion.

## 6. Imports, notifications and deployment

Request sample spreadsheet formats, implement dry-run Excel imports and approved exports, and tally source vs imported data. Start with fictional staging data. Set up Cloudflare hosting and Cron, VAPID secrets and Android/iPhone validation. Test Jakarta scheduling, retries, expired devices and generic notification text. Verify free-plan quotas and operational impact, including Supabase project pausing and backup options, plus Worker CPU and subrequest limits for reminder fan-out. Accounts needed are Supabase, Cloudflare and a Google Cloud project for OAuth. Use an authorized church-owned account where available. Google Sheets API setup depends on the agreed export workflow.

- [Supabase pricing](https://supabase.com/pricing)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

## 7. Acceptance and rollout

Run role-by-role acceptance, mobile and desktop usability, backup restore, notification and import reconciliation, and end-to-end ChatGPT tests on supported surfaces. Agree on production data handling and validate capacity at zero incremental cost before cutover. Keep the old data snapshot available for rollback.
