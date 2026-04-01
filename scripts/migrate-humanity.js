/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getServiceAccountFromEnv() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

const projectRoot = path.resolve(__dirname, "..");
loadEnvFile(path.join(projectRoot, ".env.local"));

const serviceAccount = getServiceAccountFromEnv();

if (!serviceAccount) {
  console.error("Missing Firebase Admin credentials.");
  console.error("");
  console.error("Add these to your .env.local:");
  console.error("FIREBASE_ADMIN_PROJECT_ID=your-project-id");
  console.error("FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-client-email");
  console.error('FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.error("");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrate() {
  console.log("🚀 Starting WildTech migration...");
  console.log(`Using Firebase project: ${serviceAccount.projectId}`);

  const snapshot = await db.collection("characters").get();

  if (snapshot.empty) {
    console.log("No characters found.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};
    const patch = {};
    let needsUpdate = false;

    const currentHumanity =
      typeof data.humanity === "number" ? data.humanity : undefined;

    if (currentHumanity === undefined || currentHumanity === 10) {
      patch.humanity = 100;
      needsUpdate = true;
    }

    if (typeof data.mutationLevel !== "number") {
      patch.mutationLevel = 0;
      needsUpdate = true;
    }

    if (!Array.isArray(data.grafts)) {
      patch.grafts = [];
      needsUpdate = true;
    }

    if (!Array.isArray(data.availableGraftIds)) {
      patch.availableGraftIds = [];
      needsUpdate = true;
    }

    if (needsUpdate) {
      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      batch.update(docSnap.ref, patch);
      batchCount += 1;
      updated += 1;
      console.log(`✔ Queued ${docSnap.id}`, patch);
    } else {
      skipped += 1;
      console.log(`– Skipped ${docSnap.id} (already compliant)`);
    }

    if (batchCount === 400) {
      await batch.commit();
      console.log(`📦 Committed batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`📦 Committed final batch of ${batchCount}`);
  }

  console.log("");
  console.log("✅ Migration complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:");
  console.error(err);
  process.exit(1);
});