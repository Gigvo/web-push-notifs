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

export async function POST(req: Request) {
  try {
    // Check for API key in headers
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedApiKey = process.env.NOTIFICATION_API_KEY;

    if (!expectedApiKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid or missing API key" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const topic = "all-users";
    await admin.messaging().subscribeToTopic(token, topic);

    return NextResponse.json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
    });
  } catch (err: unknown) {
    console.error("Error subscribing to topic:", err);

    // Narrow the error type
    const message = err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
