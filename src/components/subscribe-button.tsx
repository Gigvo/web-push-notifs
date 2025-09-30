"use client";

import { useState, useContext, useEffect, useCallback } from "react";
import React from "react";
import { useCurrentUser } from "@/utils/useCurrentUser";
import { DeviceTypes, isPWA, useDevice } from "@/utils/useDevice";
import { PushNotificationsContext } from "./push-notifications-provider";
import { fetchToken } from "@/lib/firebase";
import { useRef } from "react";

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/30"
        />
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
  const subscribedRef = useRef(false);
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

  const handleNotificationSubscription = useCallback(async () => {
    try {
      // Check if messaging is available
      if (!messaging) {
        console.log("Messaging context not available, skipping subscription");
        return;
      }

      // iOS PWA check
      if (device === DeviceTypes.IOS && !isPWA()) {
        throw new Error(
          'On iPhone you must install the app first, by clicking on Share button in browser and selecting "Add to Home Screen"'
        );
      }

      setIsLoading(true);
      setProgress(0);

      // Basic browser support check
      if (!("Notification" in window)) {
        throw new Error("Notifications are not supported on this browser.");
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Workers are not supported on this browser.");
      }

      setProgress(10);

      // Register or get service worker FIRST (critical for iOS)
      let registration = await navigator.serviceWorker.getRegistration("/");
      setProgress(20);

      if (!registration) {
        console.log("Registering new service worker...");
        registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
        setProgress(30);
      }

      // Wait for service worker to be ready (critical for iOS)
      console.log("Waiting for service worker to be ready...");
      await navigator.serviceWorker.ready;
      setProgress(40);

      // For iOS, add extra wait time to ensure service worker is fully active
      if (device === DeviceTypes.IOS) {
        console.log("iOS detected, waiting for service worker to stabilize...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setProgress(50);

      // Now check current permission status
      const currentPermission = Notification.permission;
      console.log("Current notification permission:", currentPermission);
      setPermissionStatus(currentPermission);

      // If permission is already denied, inform the user
      if (currentPermission === "denied") {
        throw new Error(
          device === DeviceTypes.IOS
            ? "Notifications are blocked. Go to Settings > [Your Browser/App Name] > Notifications and enable them, then restart the app."
            : "Notifications are blocked. Please enable them in your browser settings and refresh the page."
        );
      }

      setProgress(60);

      // Get Firebase token (this will request permission if needed)
      console.log("Fetching Firebase token...");
      let firebaseToken;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // fetchToken will internally call Notification.requestPermission if needed
          firebaseToken = await fetchToken();

          if (firebaseToken) {
            console.log("Successfully obtained Firebase token");
            break;
          }
        } catch (tokenError) {
          console.error(
            `Token fetch attempt ${retryCount + 1} failed:`,
            tokenError
          );
          retryCount++;

          // Check if permission was denied during token fetch
          if (Notification.permission === "denied") {
            throw new Error(
              device === DeviceTypes.IOS
                ? "Notification permission was denied. Please enable notifications in your device settings."
                : "Notification permission was denied. Please enable notifications in your browser settings."
            );
          }

          if (retryCount < maxRetries) {
            console.log(`Waiting before retry ${retryCount + 1}...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw new Error(
              "Failed to get notification token after multiple attempts. Please try again later."
            );
          }
        }
      }

      if (!firebaseToken) {
        throw new Error(
          "Unable to get notification token. Please check your internet connection and try again."
        );
      }

      setProgress(80);

      // Update permission status after successful token fetch
      setPermissionStatus(Notification.permission);

      // Subscribe to topic
      console.log("Subscribing to topic...");
      const subscriptionResponse = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: firebaseToken }),
      });

      setProgress(90);

      if (subscriptionResponse.ok) {
        console.log("Successfully subscribed to topic");
      } else {
        const errorData = await subscriptionResponse.json();
        console.error("Failed to subscribe to topic:", errorData);
        throw new Error(
          errorData.error || "Failed to subscribe to notifications"
        );
      }

      setProgress(100);

      // Update user with token
      if (user) {
        user.data.firebaseToken = firebaseToken ?? undefined;
      }

      showToast("🎉 Notifications enabled successfully!", "success");
    } catch (error: unknown) {
      let message = "Failed to enable notifications";
      if (error instanceof Error) {
        message = error.message;
        console.error("Subscription error:", error);
      } else {
        console.error("Subscription error:", error);
      }

      // Update permission status in case it changed
      if ("Notification" in window) {
        setPermissionStatus(Notification.permission);
      }

      showToast(message, "error");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, [messaging, user, device]);

  // Auto-request permission on component mount
  useEffect(() => {
    if (!messaging) return;
    if (subscribedRef.current) return;

    const subscribe = async () => {
      subscribedRef.current = true;

      // For iOS PWA, add a longer delay to ensure everything is loaded
      if (device === DeviceTypes.IOS && isPWA()) {
        console.log("iOS PWA detected, waiting for initialization...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // Small delay for other platforms too
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await handleNotificationSubscription();
    };

    subscribe();
  }, [messaging, handleNotificationSubscription, device]);

  // Monitor permission changes
  useEffect(() => {
    if (!("Notification" in window)) return;

    const checkPermission = () => {
      setPermissionStatus(Notification.permission);
    };

    // Check initially
    checkPermission();

    // Set up interval to check for permission changes (useful for iOS)
    const interval = setInterval(checkPermission, 2000);

    return () => clearInterval(interval);
  }, []);

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
                  ? device === DeviceTypes.IOS
                    ? "Enable in Settings > Notifications"
                    : "Enable in browser settings"
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

              <div className="flex-1">
                <p className="font-medium text-sm leading-5">{toast.message}</p>
              </div>
            </div>

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
