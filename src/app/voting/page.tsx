"use client";

import NotificationForm from "@/components/send-notification";
import { useCurrentUser } from "@/utils/useCurrentUser";

export default function Home() {
  const { token, user } = useCurrentUser();

  const handleContentCopyClick = () => {
    navigator.clipboard.writeText(user?.data.firebaseToken || "");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Push Notifications
        </h1>

        {/* Notification Form Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Send Notification</h2>
          <NotificationForm />
        </div>
      </div>
    </div>
  );
}
