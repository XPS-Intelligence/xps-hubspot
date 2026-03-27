import { PipelineStatus } from '@/components/PipelineStatus';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Pipeline status and recent activity</p>
      </div>

      <PipelineStatus />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <a href="/seeds/new" className="block w-full rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100">
              + Add New Seed
            </a>
            <a href="/dispatch" className="block w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ▶ Dispatch Pipeline
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">System Status</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>API</span>
              <span className="font-medium text-green-600">● Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="font-medium text-green-600">● Healthy</span>
            </div>
            <div className="flex justify-between">
              <span>Queue</span>
              <span className="font-medium text-blue-600">● Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
