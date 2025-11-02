'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MessageSquare, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics?days=30');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading analytics...</div>;
  }

  const messagesByChannel = analytics?.messagesByChannel || [];
  const messagesByStatus = analytics?.messagesByStatus || [];
  const dailyMessages = analytics?.dailyMessages || [];

  const channelData = messagesByChannel.map((item: any) => ({
    name: item.channel,
    value: item._count,
  }));

  const statusData = messagesByStatus.map((item: any) => ({
    name: item.status,
    value: item._count,
  }));

  const totalMessages = analytics?.totalMessages || 0;
  const avgResponseTime = analytics?.avgResponseTime || 0;
  const outboundCount = analytics?.outboundCount || 0;
  const inboundCount = analytics?.inboundCount || 0;

  const directionData = [
    { name: 'Inbound', value: inboundCount },
    { name: 'Outbound', value: outboundCount },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Last 30 days</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Total Messages"
          value={totalMessages}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Avg Response Time"
          value={`${avgResponseTime} min`}
          color="green"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          title="Delivered"
          value={statusData.find((s: any) => s.name === 'DELIVERED')?.value || statusData.find((s: any) => s.name === 'SENT')?.value || 0}
          color="green"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          title="Failed"
          value={statusData.find((s: any) => s.name === 'FAILED')?.value || 0}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages by Channel */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Messages by Channel</h2>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Messages by Status */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Messages by Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages by Direction */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Inbound vs Outbound</h2>
          {directionData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={directionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#3B82F6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Channel Performance */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Channel Performance</h2>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Daily Messages */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Daily Message Volume</h2>
        {dailyMessages.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyMessages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

