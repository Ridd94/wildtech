/* eslint-disable no-console */
const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS env var. Point it at your Firebase service account JSON file."
  );
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function backfillCharacters() {
  console.log("Starting WildTech character humanity backfill...");

  const snapshot = await db.collection("characters").get();

  if (snapshot.empty) {
    console.log("No character documents found.");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};

    const currentHumanity =
      typeof data.humanity === "number" ? data.humanity : undefined;
    const currentMutation =
      typeof data.mutationLevel === "number" ? data.mutationLevel : undefined;
    const currentGrafts = Array.isArray(data.grafts) ? data.grafts : undefined;
    const currentAvailableGraftIds = Array.isArray(data.availableGraftIds)
      ? data.availableGraftIds
      : undefined;

    const patch = {};
    let needsUpdate = false;

    if (currentMutation === undefined) {
      patch.mutationLevel = 0;
      needsUpdate = true;
    }

    if (currentHumanity === undefined || currentHumanity <= 10) {
      patch.humanity = 100;
      needsUpdate = true;
    }

    if (!Array.isArray(currentGrafts)) {
      patch.grafts = [];
      needsUpdate = true;
    }

    if (!Array.isArray(currentAvailableGraftIds)) {
      patch.availableGraftIds = [];
      needsUpdate = true;
    }

    if (needsUpdate) {
      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      batch.update(docSnap.ref, patch);
      opsInBatch += 1;
      updatedCount += 1;

      if (opsInBatch >= 400) {
        await batch.commit();
        console.log(`Committed batch of ${opsInBatch} updates...`);
        batch = db.batch();
        opsInBatch = 0;
      }
    } else {
      skippedCount += 1;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${opsInBatch} updates...`);
  }

  console.log("Backfill complete.");
  console.log(`Updated characters: ${updatedCount}`);
  console.log(`Skipped characters already compliant: ${skippedCount}`);
}

backfillCharacters()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });