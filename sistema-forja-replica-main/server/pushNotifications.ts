import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { ENV } from "./_core/env";

// Configure web-push with VAPID keys
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:sistema@life.app",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}

export async function saveSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const db = await getDb();
  if (!db) return;

  // Remove existing subscriptions for this endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  for (const sub of existing) {
    if (sub.endpoint === subscription.endpoint) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
  }

  // Save new subscription
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

export async function removeSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  for (const sub of subs) {
    if (sub.endpoint === endpoint) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
  }
}

export async function sendPushToUser(
  userId: number,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: any) {
      failed++;
      // Remove invalid subscriptions (410 Gone or 404)
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { sent, failed };
}

export async function sendPushToAllUsers(payload: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const allSubs = await db.select().from(pushSubscriptions);

  let sent = 0;
  let failed = 0;

  for (const sub of allSubs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { sent, failed };
}
