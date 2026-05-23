import React, { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import VerificationForm from "./components/VerificationForm";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Toggle between public client and admin workstation views
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans" id="app-root-container">
      {/* Brand Top Header */}
      <Header />

      {/* Main Core Content Stage */}
      <main className="flex-grow flex items-center justify-center p-4 py-8">
        {showAdmin ? (
          <AdminPanel onClose={() => setShowAdmin(false)} />
        ) : (
          <VerificationForm />
        )}
      </main>

      {/* Corporate bottom footer containing Legal & Administration Link */}
      <Footer onAdminClick={() => setShowAdmin(true)} />
    </div>
  );
}
