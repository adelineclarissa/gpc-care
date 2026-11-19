# ChurchCare

A lightweight church CRM for a small volunteer team. It uses Node.js 24, SQLite, and a responsive installable web app. All configured accounts are administrators. Member and follow-up assignments route reminders and support the “Assigned to me” filter.

## Preview

Run `npm start` and open http://localhost:3000. The demo starts signed in as Grace Wilson, uses fictional records in `demo.sqlite`, and does not send notifications. Use the account menu to try another demo administrator.

## Run for your church

Use a single always-on Node.js 24+ host with a persistent disk. An existing church computer or an eligible free VM can avoid a monthly hosting subscription. Use an HTTPS reverse proxy and a hostname your volunteers can access. An existing hostname or a free dynamic DNS hostname can avoid a new domain fee. Availability, transit, and electricity depend on the host you choose.

1. Install dependencies with `npm ci --omit=dev`.
2. Put the following variables in a private environment file. Give each administrator a unique strong password and keep their ID stable. Start with a new production database on a persistent volume.
3. Run `node --env-file=.env server.js` as a single supervised service. Configure the reverse proxy to serve `CRM_ORIGIN` and forward requests to port 3000. Keep the Node port private.
4. Open the HTTPS address and sign in. Add members before recording attendance. Use SQLite's online backup command and periodically test a restore. Keep backups private because they contain member information and pastoral notes.

```dotenv
CRM_ORIGIN=https://care.your-church.example
CRM_TIMEZONE=Asia/Jakarta
CRM_DB=/var/lib/churchcare/churchcare.sqlite
CRM_USERS='[{"id":"admin1","name":"First Admin","email":"admin1@example.org","password":"REPLACE-WITH-A-UNIQUE-LONG-PASSWORD"},{"id":"admin2","name":"Second Admin","email":"admin2@example.org","password":"REPLACE-WITH-ANOTHER-LONG-PASSWORD"}]'
```

To revoke access, remove the administrator from `CRM_USERS` and restart. To invalidate all existing sessions after a password rotation, stop the service and clear the SQLite `sessions` table before restarting. Reassign their open follow-ups and member records through the app before removing an account.

## Reminders

- Generate a Web Push key pair with `npx web-push generate-vapid-keys`. Store the result as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT=mailto:your-admin@example.org`. Keep the same keys across restarts.
- On Android, open ChurchCare in Chrome and use its install option. On iOS or iPadOS 16.4+, use Safari’s **Add to Home Screen**, then open ChurchCare from the installed icon. Go to **Settings** and enable push on each device.
- For Telegram fallback, set `TELEGRAM_BOT_TOKEN` to a private bot token. Each administrator should start a private conversation with the bot, retrieve their private chat ID via the Telegram Bot API or the bot operator, enter it in **Settings**, and save their preferences.
- The server checks for birthdays, due follow-ups, and inactivity every minute in the church timezone. Three consecutive recorded services missed after a member was added automatically create a follow-up. Assigned alerts go to the assigned administrator. Unassigned alerts go to administrators who have opted into that reminder type.
- Preferences are per administrator. The app tries that administrator’s registered push devices first and uses Telegram when none accept delivery. Push acceptance is determined by the push provider. Notifications use generic text and members’ details stay behind sign-in.
- The installable shell can open offline. Reading and updating church records requires a connection, and the service worker does not cache those records.
