import Link from 'next/link';
import { MessageSquare, Users, BarChart3, Calendar } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Unified Inbox
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage all your customer communications in one place
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="Multi-Channel"
            description="SMS, WhatsApp, Email, and social media in one inbox"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Contact Management"
            description="Unified contact profiles with complete history"
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Scheduling"
            description="Schedule messages and automate follow-ups"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Analytics"
            description="Track engagement and response metrics"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
