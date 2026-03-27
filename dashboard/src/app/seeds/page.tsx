'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { SeedTable } from '@/components/SeedTable';
import { seedsApi } from '@/lib/api-client';

export default function SeedsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['seeds', page],
    queryFn: () => seedsApi.list(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => seedsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seeds'] }),
  });

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => seedsApi.dispatch(id),
    onSuccess: () => alert('Pipeline dispatched!'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seeds</h1>
          <p className="mt-1 text-sm text-gray-500">Manage scraping targets</p>
        </div>
        <Link href="/seeds/new" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + New Seed
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <SeedTable
            seeds={data?.seeds ?? []}
            onDelete={(id) => { if (confirm('Delete this seed?')) deleteMutation.mutate(id); }}
            onDispatch={(id) => dispatchMutation.mutate(id)}
          />
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Previous</button>
              <span className="py-1 text-sm text-gray-600">Page {page} of {data.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data.totalPages ?? 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
