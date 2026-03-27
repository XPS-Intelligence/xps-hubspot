'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DispatchPanel } from '@/components/DispatchPanel';
import { PipelineStatus } from '@/components/PipelineStatus';
import { seedsApi, dispatchApi } from '@/lib/api-client';
import type { PipelineRun } from '@/lib/api-client';

export default function DispatchPage() {
  const qc = useQueryClient();

  const { data: seedsData } = useQuery({
    queryKey: ['seeds-all'],
    queryFn: () => seedsApi.list(1, 100),
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['pipeline-runs'],
    queryFn: () => dispatchApi.listRuns(1, 10),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ seedIds, triggerType }: { seedIds: string[]; triggerType: string }) =>
      dispatchApi.trigger(seedIds, triggerType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-runs'] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
        <p className="mt-1 text-sm text-gray-500">Trigger pipeline runs manually</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Run Pipeline</h2>
        <DispatchPanel
          seeds={seedsData?.seeds ?? []}
          onDispatch={(seedIds, triggerType) =>
            dispatchMutation.mutateAsync({ seedIds, triggerType }) as Promise<PipelineRun>
          }
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Recent Runs</h2>
        <PipelineStatus recentRuns={runsData?.runs ?? []} isLoading={runsLoading} />
      </div>
    </div>
  );
}
