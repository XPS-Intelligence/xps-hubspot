'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LeadTable } from '@/components/LeadTable';
import { leadsApi } from '@/lib/api-client';

export default function LeadsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => leadsApi.list(page),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="mt-1 text-sm text-gray-500">
          {data ? `${data.total} total leads` : 'Lead management'}
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <LeadTable leads={data?.leads ?? []} />
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
