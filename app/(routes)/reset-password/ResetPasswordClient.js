"use client";
import { useState } from "react";
import { resetPassword } from "../../../utils/auth";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setMessage(result.message);
        // In a real app, you might want to redirect to login after a delay
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  };

  // If no token is provided, show an error
  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-10">
        <h1 className="font-display text-4xl text-brand-blue">Invalid Reset Link</h1>
        <p className="mt-3 text-gray-700">
          This password reset link is invalid or has expired. Please request a new password reset from the login page.
        </p>
        <a href="/login" className="mt-4 inline-block text-brand-blue hover:underline">
          Return to login
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="font-display text-4xl text-brand-blue">Reset Password</h1>
      <p className="mt-3 text-gray-700">Enter your new password below.</p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 p-3 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm">
          {message}
          <div className="mt-2">
            <a href="/login" className="text-brand-blue hover:underline">Return to login</a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter new password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Confirm new password"
            required
            minLength={8}
          />
        </div>

        <button type="submit" disabled={loading} className={`w-full rounded btn-multicolor py-2 relative ${loading ? 'opacity-80' : ''}`}>
          {loading ? 'Please wait...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
