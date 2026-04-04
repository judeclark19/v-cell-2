/* 
The practical flow is:
	1.	User signs in on the client with Firebase.
	2.	Client gets the ID token via currentUser.getIdToken().
	3.	Client POSTs that token to something like /api/auth/session.
	4.	That route verifies/exchanges it with Firebase Admin and sets an HTTP-only cookie.
	5.	Middleware checks that cookie and redirects /game, /login, /, etc. before the page renders.  ￼
*/

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n")
    })
  });
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
