"use client";

import { useState, useContext, useEffect } from "react";
// import { getToken } from "firebase/messaging";
import React from "react";
import { useCurrentUser } from "@/utils/useCurrentUser";
import { DeviceTypes, isPWA, useDevice } from "@/utils/useDevice";
import { PushNotificationsContext } from "./push-notifications-provider";
import { fetchToken } from "@/lib/firebase";

// Types
interface ToastState {
  show: boolean;
  type: "success" | "error" | "info";
  message: string;
}

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgressWithLabel: React.FC<CircularProgressProps> = ({
  value,
  size = 20,
  strokeWidth = 2,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-white transition-all duration-300 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-white">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
};

export const AutoNotificationSubscriber: React.FC = () => {
  const messaging = useContext(PushNotificationsContext);
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: "success",
    message: "",
  });

  const device = useDevice();

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleNotificationSubscription = async () => {
    try {
      // Check if messaging is available
      if (!messaging) {
        console.log("Messaging context not available, skipping subscription");
        return; // Exit silently instead of throwing error
      }

      // iOS PWA check
      if (device === DeviceTypes.IOS && !isPWA()) {
        throw new Error(
          'On iPhone you must install the app first, by clicking on Share button in browser and selecting "Add to Home Screen"'
        );
      }

      setIsLoading(true);
      setProgress(0);

      // Request notification permission
      setProgress(10);
      const result = await Notification.requestPermission();
      setProgress(20);
      setPermissionStatus(result);

      if (result !== "granted") {
        if (result === "denied") {
          throw new Error(
            "Notifications were blocked. Please enable them in your browser settings."
          );
        } else {
          throw new Error("Notification permission was dismissed.");
        }
      }

      // Check for service worker support
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Workers unavailable");
      }

      // Register or get service worker
      let registration = await navigator.serviceWorker.getRegistration("/");
      setProgress(40);

      if (!registration) {
        registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
      }
      setProgress(60);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      setProgress(80);

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
        console.log("Successfully subscribed to topic");
      } else {
        console.error("Failed to subscribe to topic");
      }

      setProgress(100);

      // Update user with token
      if (user) {
        user.data.firebaseToken = firebaseToken ?? undefined;
      }

      showToast("🎉 Notifications enabled successfully!", "success");
    } catch (error: any) {
      console.error("Subscription error:", error.message);
      showToast(error.message || "Failed to enable notifications", "error");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Auto-request permission on component mount
  useEffect(() => {
    const requestPermissionOnLoad = async () => {
      if (!messaging) {
        console.log("Messaging not ready yet, skipping until available...");
        return;
      }

      const currentPermission = Notification.permission;
      setPermissionStatus(currentPermission);

      if (currentPermission !== "granted") {
        // Ask for permission + subscribe
        await handleNotificationSubscription();
      } else {
        // Already granted, still ensure subscription is up to date
        showToast("Notifications are already enabled", "info");
        await handleNotificationSubscription();
      }
    };

    if ("Notification" in window) {
      requestPermissionOnLoad();
    } else {
      showToast("This browser doesn't support notifications", "error");
    }
  }, [messaging, user]);

  return (
    <>
      {/* Status indicator */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-100">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <CircularProgressWithLabel value={progress} size={24} />
            <span className="text-gray-700">Setting up notifications...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  permissionStatus === "granted"
                    ? "bg-green-500"
                    : permissionStatus === "denied"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="text-gray-700">
                Notifications:{" "}
                {permissionStatus === "granted"
                  ? "Enabled"
                  : permissionStatus === "denied"
                  ? "Blocked"
                  : "Pending"}
              </span>
            </div>

            {permissionStatus !== "granted" && (
              <div className="text-sm text-gray-600">
                {permissionStatus === "denied"
                  ? "Enable in browser settings to receive notifications"
                  : "Requesting permission..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 max-w-sm p-4 rounded-xl shadow-2xl backdrop-blur-sm transition-all duration-500 transform z-50 animate-slide-up ${
            toast.type === "success"
              ? "bg-green-500/90 text-white border border-green-400/30"
              : toast.type === "error"
              ? "bg-red-500/90 text-white border border-red-400/30"
              : "bg-blue-500/90 text-white border border-blue-400/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "success" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : toast.type === "error" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="flex-1">
                <p className="font-medium text-sm leading-5">{toast.message}</p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="flex-shrink-0 ml-4 text-white/80 hover:text-white transition-colors duration-200 focus:outline-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-white/20 rounded-full h-1">
            <div
              className="bg-white h-1 rounded-full transition-all duration-4000 ease-linear"
              style={{ width: toast.show ? "0%" : "100%" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AutoNotificationSubscriber;
