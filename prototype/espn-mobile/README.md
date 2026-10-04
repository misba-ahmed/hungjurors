# Private mobile ESPN connection proof

No desktop extension. No changes to hungjurors.com. No fantasy write capability.
This is an isolated single-user temporary cloud browser controlled from a phone.
It is NOT a completed ESPN integration and NOT yet verified with a real account.

## Deploy for a phone test
Use the Render Blueprint in this branch:
https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmisba-ahmed%2Fhungjurors%2Ftree%2Fprivate-espn-connection-prototype

Choose a private TEST_ACCESS_CODE of at least 20 characters in Render's secret form.
Do not paste it or your ESPN credentials into chat. Render supplies its HTTPS origin automatically.
Open the resulting onrender.com URL on your phone, enter your private code, then open ESPN sign-in.
Tap an ESPN field and use the masked typing box to send text with your phone keyboard.
ESPN credentials traverse your private HTTPS backend into the temporary browser. No request logging, recordings, password persistence, or cookie exports are configured by this app.
Use the ESPN window for your sign-in and verification code. Enter your league ID, then Read my team.
End test clears the cloud browser. Sessions expire after 20 minutes; restarts erase state.
The free test host may sleep or lack memory for Chromium. Hosting/resource limits and ESPN cloud-browser acceptance need live testing. No paid services are provisioned automatically.

## Safety boundary
Only one session at a time, protected by a 20+ character access code, HttpOnly Secure SameSite session cookie, same-origin POST checks, and per-session CSRF token.
No user-supplied navigation URLs. Allowlisted ESPN/Disney resources only. No WebSockets, downloads, external popups, service workers or browser persistence.
Fantasy write host and transaction endpoints blocked; fantasy requests other than GET/HEAD/OPTIONS blocked.
The only application ESPN data request is a fixed-host GET.
The login browser can submit authentication forms to ESPN's Disney identity hosts; this is necessary for sign-in.
Your credentials can exist in process memory during sign-in; the hosting provider operates that process. Do not enable request-body logging or session recording.

## Evidence and outstanding work
Automated tests verify access control, navigation restrictions, read-only behavior, input validation, and ownership filtering using fixtures.
Real ESPN sign-in, mobile usability on physical devices, data-center access and authenticated reads are NOT YET VERIFIED.
No writes or multi-user cloud storage are implemented. After successful connection, build preview/confirm transaction tests for a specifically authorized live roster change. Do not merge this branch to production.
Research:
https://docs.browserbase.com/platform/browser/observability/session-live-view (mobile live views need explicit keyboard handling)
https://playwright.dev/docs/docker
https://support.fantasypros.com/hc/en-us/articles/360051313453
