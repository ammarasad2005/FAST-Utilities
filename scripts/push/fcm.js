/**
 * Shared FCM sender for the campus-updates topic.
 *
 * Credentials: the FULL service-account JSON, passed via the
 * FIREBASE_SERVICE_ACCOUNT env (stored as a GitHub Actions secret).
 * Spark (free) plan is enough — FCM sends are unlimited and never billed;
 * only Cloud Functions force the Blaze plan, which this design avoids.
 */
const admin = require('firebase-admin');

const TOPIC = 'campus_updates';

let cachedApp = null;

function getMessaging() {
  if (!cachedApp) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env is not set (expected full service-account JSON)');
    }
    const sa = JSON.parse(raw);
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert(sa),
    }, 'campus-updates');
  }
  return admin.messaging(cachedApp);
}

/**
 * Data-only, high-priority ping. The app wakes even from a dead process,
 * re-fetches the campus data, and runs its EXISTING local tagged-only diff —
 * so scoping/privacy semantics never touch the server. `keys` is informational.
 */
async function sendCampusPing(keys) {
  const at = Date.now().toString();
  await getMessaging().send({
    topic: TOPIC,
    data: { keys: keys.join(','), at },
    android: { priority: 'HIGH', ttl: 60 * 60 * 1000 },
  });
  console.log(`[fcm] ping sent → topic ${TOPIC}, keys=${keys.join(',')}`);
}

module.exports = { sendCampusPing, TOPIC };
