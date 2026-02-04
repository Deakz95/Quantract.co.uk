export default function QrNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl font-extrabold text-gray-400 mb-4">404</div>
        <h1 className="text-lg font-bold text-gray-900">Certificate not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This QR code is not linked to a valid certificate.
        </p>
      </div>
    </div>
  );
}
