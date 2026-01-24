'use client';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-white border rounded p-4">
      <h2 className="font-semibold mb-2">This page failed to load</h2>
      <p className="text-sm text-gray-600 mb-3">{error?.message}</p>
      <button onClick={() => reset()} className="px-3 py-2 border rounded">Retry</button>
    </div>
  );
}
