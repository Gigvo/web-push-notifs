import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.error("Missing Firebase Admin credentials");
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, "\n"),
          clientEmail,
        }),
      });
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    const payload = {
      notification: {
        title: body.notificationTitle,
        body: body.notificationBody,
      },
      data: body.url ? { url: body.url } : undefined,
      topic: "all-users",
    };

    await admin.messaging().send(payload);

    return NextResponse.json({
      message: "Notification sent successfully",
    });
  } catch (err: unknown) {
    console.error("Error sending notification:", err);

    // Narrow the error type
    const message =
      err instanceof Error ? err.message : "An unknown error occurred";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
