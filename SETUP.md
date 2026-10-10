# One-time setup (about 10 minutes, on the teacher's own Google account)
1. Create a Google Sheet "Dance Fee Parents". Extensions > Apps Script. Paste Code.gs. Edit the CFG block (fee, due day, UPI, site URL).
2. Project Settings > Script Properties > add ADMIN_PASSCODE = a passcode only the teacher knows (this protects the dashboard).
3. Run `setup` once and approve permissions. It creates the daily 9am reminder trigger and the "Parents" tab.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app URL.
5. Put that URL in config.js as reminderSignupUrl and commit. The signup form appears on the home page and admin.html starts working.
Dashboard: open /admin.html, enter the passcode. Add parents, set each one's fee and due day, mark paid, send an email reminder now, or open a prefilled WhatsApp message.
Reminders: emailed automatically at (due day - 3) and on the due day, to unpaid active parents. "Paid this month" resets on the 1st. Free Gmail allows about 100 emails per day.
WhatsApp: the home page has an "I have paid" click-to-chat button, and the dashboard has a tap-to-send WhatsApp reminder per parent. Fully automatic WhatsApp needs the WhatsApp Business API with business verification (not included).
Data stays in the teacher's own Drive. No payment is processed by this site (parents pay by UPI/bank directly), so there are no app-store or gateway fees.
