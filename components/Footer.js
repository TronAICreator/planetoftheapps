export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">
        © {new Date().getFullYear()} Phonics Academy. All rights reserved.
      </div>
    </footer>
  );
}