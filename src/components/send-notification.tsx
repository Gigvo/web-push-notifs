"use client";

import { useState } from "react";
import { AutoNotificationSubscriber } from "./subscribe-button";
// import { useCurrentUser } from "@/utils/useCurrentUser";

export default function NotificationForm() {
  // const [showForm, setShowForm] = useState(false);
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  // const { token } = useCurrentUser();

  // useEffect(() => {
  //   if (token) {
  //     setShowForm(true);
  //   }
  // }, [token]);

  // const showToast = (message: string, type: "success" | "error") => {
  //   setToast({ show: true, type, message });
  //   setTimeout(() => {
  //     setToast((prev) => ({ ...prev, show: false }));
  //   }, 3000);
  // };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!token) {
  //     showToast("Firebase token is not available.", "error");
  //     return;
  //   }

  //   setIsSubmitting(true);

  //   try {
  //     const notificationData = {
  //       notificationTitle: "Hello from the app!",
  //       url: "https://example.com",
  //       notificationBody: "This is a manually sent notification.",
  //     };
  //     const response = await fetch("/api/notifications", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(notificationData),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to send notification.");
  //     }

  //     showToast("Notification sent successfully!", "success");
  //   } catch (error) {
  //     console.error("Error sending notification:", error);
  //     showToast("Failed to send notification!", "error");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  return (
    <>
      <AutoNotificationSubscriber />
      {/* {showForm && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !token}
          className="w-full mt-4 bg-black text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none uppercase tracking-wider"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Sending...
            </div>
          ) : (
            "Send Manual Notification"
          )}
        </button>
      )} */}

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl backdrop-blur-sm transition-all duration-300 z-50 ${
            toast.type === "success"
              ? "bg-green-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
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
            </button>
          </div>
        </div>
      )}
    </>
  );
}
