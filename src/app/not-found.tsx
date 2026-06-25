import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-3 text-gray-600">We couldn’t find that page.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-[var(--color-primary)] hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
