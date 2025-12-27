"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Clear any existing session data on component mount
  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }, []);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Login successful! Redirecting...");
        
        // Store user session in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Role-based routing
        if (data.user.role === "admin") {
          window.location.href = "/admin";
        } else if (data.user.role === "student") {
          window.location.href = "/lessons";
        } else {
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="font-display text-brand-blue" style={{fontSize: '36px'}}>
        Login
      </h1>
      <p className="mt-3 text-gray-700" style={{fontSize: '22px'}}>
        Sign in to access your lessons and track progress.
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg" style={{fontSize: '16px'}}>
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 p-3 bg-green-50 border border-green-100 text-green-600 rounded-lg" style={{fontSize: '16px'}}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label htmlFor="email" className="block font-medium text-gray-700 mb-1" style={{fontSize: '24px'}}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            style={{fontSize: '22px'}}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="flex justify-between items-center font-medium text-gray-700 mb-1" style={{fontSize: '24px'}}>
            Password
            <Link 
              href="/forgot-password" 
              className="text-indigo-600 hover:text-indigo-500 text-sm font-normal"
            >
              Forgot password?
            </Link>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            style={{fontSize: '22px'}}
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded btn-multicolor py-3 relative ${loading ? 'opacity-80' : ''}`}
          style={{fontSize: '24px'}}
        >
          {loading ? 'Please wait...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600" style={{fontSize: '16px'}}>
          Need help?{' '}
          <Link 
            href="/forgot-password" 
            className="text-indigo-600 hover:text-indigo-500"
          >
            Reset your password
          </Link>
        </p>
      </div>
    </div>
  );
}