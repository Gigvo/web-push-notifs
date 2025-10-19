"use client";

import { useState, useContext, useEffect } from "react";
import React from "react";
import { useCurrentUser } from "@/utils/useCurrentUser";
import { DeviceTypes, isPWA, useDevice } from "@/utils/useDevice";
import { PushNotificationsContext } from "./push-notifications-provider";
import { fetchToken } from "@/lib/firebase";
import { IOSPWATutorial } from "./ios-pwa-tutorial";

export const NotificationSubscriber: React.FC = () => {
  const [showIOSTutorial, setShowIOSTutorial] = useState(false);
  const messaging = useContext(PushNotificationsContext);
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const device = useDevice();

  const isIOSSafari = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);
    return isIOS && isSafari;
  };

  const handleNotificationSubscription = async () => {
    try {
      // Check if messaging is available
      if (!messaging) {
        console.log("Messaging context not available, skipping subscription");
        return;
      }

      // iOS PWA check
      if (device === DeviceTypes.IOS && !isPWA() && isIOSSafari()) {
        setShowIOSTutorial(true);
        return;
      }

      setIsLoading(true);

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermissionStatus(result);

      if (result !== "granted") {
        setIsLoading(false);
        return;
      }

      // Check for service worker support
      if (!("serviceWorker" in navigator)) {
        setIsLoading(false);
        return;
      }

      // Register or get service worker
      let registration;
      try {
        registration = await navigator.serviceWorker.getRegistration("/");

        if (!registration) {
          registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            {
              scope: "/",
              type: "classic",
            }
          );
        }
      } catch (swError: any) {
        console.error("Service worker registration failed:", swError);
        setIsLoading(false);
        return;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get Firebase token
      const firebaseToken = await fetchToken();

      const subscriptionResponse = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: firebaseToken }),
      });

      if (subscriptionResponse.ok) {
        setIsSubscribed(true);

        // Update user with token
        if (user) {
          user.data.firebaseToken = firebaseToken ?? undefined;
        }
      }
    } catch (error: any) {
      console.error("Subscription error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUnsubscription = async () => {
    try {
      if (!messaging) {
        return;
      }

      setIsLoading(true);

      // Use the stored token from user data first, fallback to fetching new token
      let firebaseToken: string | null | undefined = user?.data?.firebaseToken;

      if (!firebaseToken) {
        firebaseToken = await fetchToken();
      }

      if (!firebaseToken) {
        setIsLoading(false);
        return;
      }

      // Call unsubscribe API
      const unsubscribeResponse = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: firebaseToken }),
      });

      const responseData = await unsubscribeResponse.json();

      if (unsubscribeResponse.ok && responseData.success) {
        setIsSubscribed(false);

        // Clear user token
        if (user) {
          user.data.firebaseToken = undefined;
        }
      }
    } catch (error: any) {
      console.error("Unsubscription error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTutorialComplete = () => {
    setShowIOSTutorial(false);
  };

  const handleTutorialClose = () => {
    setShowIOSTutorial(false);
  };

  const handleButtonClick = () => {
    if (isSubscribed) {
      handleNotificationUnsubscription();
    } else {
      handleNotificationSubscription();
    }
  };

  // Check current permission status and subscription status on component mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);

      // Check if user has a firebase token (indicating subscription)
      if (user?.data?.firebaseToken && Notification.permission === "granted") {
        setIsSubscribed(true);
      }
    }
  }, [user]);

  // Don't show button for denied permissions
  if (permissionStatus === "denied") {
    return null;
  }

  return (
    <>
      {/* Simple Subscribe/Unsubscribe Button */}
      <button
        onClick={handleButtonClick}
        disabled={isLoading || !messaging}
        className={`
          px-6 py-3 rounded-lg font-medium text-white transition-all duration-200
          ${
            isLoading || !messaging
              ? "bg-gray-400 cursor-not-allowed"
              : isSubscribed
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          }
        `}
      >
        {isLoading
          ? "Loading..."
          : isSubscribed
          ? "Unsubscribe"
          : "Subscribe to Notifications"}
      </button>

      {/* iOS PWA Tutorial Modal */}
      <IOSPWATutorial
        isOpen={showIOSTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </>
  );
};

export default NotificationSubscriber;
