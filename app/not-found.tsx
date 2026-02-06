import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-black tracking-tight text-slate-900">
        404
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
      >
        Back to Home
      </Link>
    </div>
  );
}
