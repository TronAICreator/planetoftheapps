"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// Public navigation for non-authenticated users
const publicNav = [
  { href: "/", label: "Home" },
  { href: "/parents", label: "Parents" },
  { href: "/students", label: "Students" },
  { href: "/login", label: "Login" },
];

// Authenticated navigation based on role
const authenticatedNav = {
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/lessons", label: "Preview Lessons" },
  ],
  student: [
    { href: "/lessons", label: "Lessons" },
  ],
};

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.log('Not authenticated');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Determine which navigation to show
  const currentNav = user ? authenticatedNav[user.role] || [] : publicNav;

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white/80 backdrop-blur border-b border-blue-100">
      <div className="mx-auto max-w-6xl h-full px-4 flex items-center justify-between">
        <Link href="/" className="no-underline flex flex-col">
          <span className="font-display text-2xl tracking-wide text-black font-bold leading-none">Smart Steps Reading</span>
          <span className="font-display text-2xl tracking-wide text-brand-blue font-bold">Phonics Academy</span>
        </Link>
        
        <nav className="flex items-center gap-4 text-sm font-medium">
          {!isLoading && currentNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`no-underline nav-link ${pathname === item.href ? 'nav-link--active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          
          {user && (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-blue-200">
              <span className="text-xs text-blue-600">
                {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}: {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}