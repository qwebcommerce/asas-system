import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const email = process.env.FIREBASE_BOOTSTRAP_EMAIL;
const password = process.env.FIREBASE_BOOTSTRAP_PASSWORD;
const name = process.env.FIREBASE_BOOTSTRAP_NAME || "Super Admin";

if (!projectId || !clientEmail || !privateKey || !email || !password) {
  console.error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_BOOTSTRAP_EMAIL and FIREBASE_BOOTSTRAP_PASSWORD in .env.local");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

const auth = getAuth();
let user;
try {
  user = await auth.getUserByEmail(email);
} catch {
  user = await auth.createUser({ email, password, displayName: name, emailVerified: true });
}

await auth.setCustomUserClaims(user.uid, { role: "superAdmin" });
await getFirestore().collection("users").doc(user.uid).set(
  {
    name,
    email,
    employeeId: "ASAS-0001",
    mobile: "",
    role: "superAdmin",
    department: "people",
    status: "active",
    lastActiveAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(`Super Admin ready: ${email}`);
