# CONNECT+24

CONNECT+24 is a room-code chat. Enter a name and a code such as `234`; anyone who
enters `234` joins the same live room. Rooms and messages are created automatically
in Firestore, and anonymous authentication means users do not need accounts.

## One-time Firebase setup

The site is static, so shared chat needs a Firebase project:

1. Create a Firebase project on the no-cost Spark plan.
2. Enable **Authentication → Sign-in method → Anonymous**.
3. Create a **Firestore Database** in production or test mode.
4. Enable **Storage** if photo/video sharing is needed.
5. Copy the web app configuration into `firebaseConfig` in `index.html`.
6. Publish the site with GitHub Pages.

The Spark plan is free within Firebase quotas, but it is not unlimited or guaranteed
for life. Firestore and Storage security rules should be configured before public
launch; do not use open test-mode rules for a production chat.