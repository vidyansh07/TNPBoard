import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Student Relationship Manager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Complete CRM solution for college placement departments
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            Sign Up
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Task Management</h3>
            <p className="text-gray-600 text-sm">
              Organize and track placement activities efficiently
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-lg font-semibold mb-2">WhatsApp Integration</h3>
            <p className="text-gray-600 text-sm">
              Manage student and recruiter conversations in one place
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2">Daily Reports</h3>
            <p className="text-gray-600 text-sm">
              AI-powered daily status report generation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
