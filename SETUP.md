# One-time setup (about 20 minutes)
1. Create a Google Sheet "Dance Fee Parents". Extensions > Apps Script. Paste Code.gs. Edit the CFG block (fee, due day, UPI, site URL).
2. Project Settings > Script Properties > add ADMIN_PASSCODE = a passcode only the teacher knows (this protects the dashboard).
3. Run `setup` once and approve permissions. It creates the daily 9am reminder trigger and the "Parents" tab.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app URL.
5. Put that URL in config.js as reminderSignupUrl and commit. The signup form appears on the home page and admin.html starts working.
Dashboard: open /admin.html, enter the passcode. Add parents, set each one's fee and due day, mark paid, send an email reminder now, or open a prefilled WhatsApp message.
Reminders: emailed automatically at (due day - 3) and on the due day, to unpaid active parents. "Paid this month" resets on the 1st. Free Gmail allows about 100 emails per day.
WhatsApp: the home page has an "I have paid" click-to-chat button, and the dashboard has a tap-to-send WhatsApp reminder per parent. Fully automatic WhatsApp needs the WhatsApp Business API with business verification (not included).
Data stays in the teacher's own Drive. No payment is processed by this site (parents pay by UPI/bank directly), so there are no app-store or gateway fees.

## Parent sign-in with Google (added)
Parents open the site, tap "Sign in with Google", and see their own children, fee, due date and status (Not paid / Waiting for teacher to confirm / Paid). They can add their child, and tap "I have paid" (with an optional UPI reference). The teacher confirms in the dashboard (money goes straight to her bank, so she is the source of truth). Reminder emails go only to parents whose status is Not paid.
Extra setup for sign-in:
1. console.cloud.google.com > new project > APIs & Services > OAuth consent screen (External, app name and support email), then Publish app (only basic email/profile scopes, no review needed).
2. Credentials > Create credentials > OAuth client ID > Web application. Authorized JavaScript origins: https://sriharshakaramchati.com (and her own domain if she gets one). Copy the Client ID.
3. Apps Script > Project Settings > Script Properties: add GOOGLE_CLIENT_ID = that Client ID. Redeploy the web app (new version).
4. In config.js set googleClientId and backendUrl, commit. Sign-in is live.
Parents are matched by Google email: the teacher can pre-add parents in the dashboard with their Gmail, or parents add their own child at first sign-in.
