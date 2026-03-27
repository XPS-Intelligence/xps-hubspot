'use client';

import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { QueueStatus, PipelineRun } from '@/lib/api-client';

interface PipelineStatusProps {
  queueStatus?: QueueStatus;
  recentRuns?: PipelineRun[];
  isLoading?: boolean;
}

export function PipelineStatus({ queueStatus, recentRuns = [], isLoading }: PipelineStatusProps) {
  if (isLoading) {
    return <div className="grid grid-cols-4 gap-4 animate-pulse">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-24 rounded-lg bg-gray-100" />
    ))}</div>;
  }

  const cards = [
    { label: 'Queue Size', value: queueStatus?.size ?? 0, icon: Activity, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: queueStatus?.pending ?? 0, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Completed', value: queueStatus?.completed ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Failed', value: queueStatus?.failed ?? 0, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-gray-200 p-4">
            <div className={`inline-flex rounded-lg p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {recentRuns.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Recent Pipeline Runs</h3>
          <div className="space-y-2">
            {recentRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded border border-gray-100 px-4 py-2 text-sm">
                <span className="font-mono text-xs text-gray-400">{run.id.slice(0, 8)}…</span>
                <span className="text-gray-600">{run.trigger_type}</span>
                <span className="text-gray-500">{run.seed_ids.length} seed(s)</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  run.status === 'completed' ? 'bg-green-100 text-green-700' :
                  run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  run.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
