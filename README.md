# CONNECT+24 on GitHub Pages

This is a static website (index.html). Chats are saved online in Google Firebase (free tier), so everyone can use it from any device, with no Claude account.

## A. Set up Firebase (about 10 minutes)
1. Go to https://console.firebase.google.com and click **Add project**.
2. **Build > Authentication > Get started > Sign-in method**: turn on **Anonymous**.
3. **Authentication > Settings > Authorized domains**: add `YOUR-GITHUB-USERNAME.github.io`  (needed or sign-in fails).
4. **Build > Firestore Database > Create database**, then open the **Rules** tab and paste the contents of `firestore.rules`, then Publish.
5. **Build > Storage > Get started** (for photos and videos; this may need the pay-as-you-go plan, small use stays free), then open the **Rules** tab and paste `storage.rules`, then Publish.
6. **Project settings (gear) > Your apps > Web (</>)**: register an app and copy the `firebaseConfig` values.
7. Open `index.html`, find `firebaseConfig`, and replace the placeholder values with yours.

## B. Upload to GitHub
1. Create an account at github.com, then **New repository** (name it e.g. `connect24`, set it Public).
2. Click **uploading an existing file**, drag in `index.html` and `.nojekyll`, then **Commit changes**.
3. Go to **Settings > Pages**. Under Source choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and Save.
4. After about a minute your site is live at `https://YOUR-GITHUB-USERNAME.github.io/connect24/`.

## C. Use your own domain (ipchat.in)
In **Settings > Pages > Custom domain** enter your domain, then add the DNS records GitHub shows you at your domain provider.

Note: the Firebase config values are safe to be public; the rules files are what protect your data.
