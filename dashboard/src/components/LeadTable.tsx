'use client';

import type { Lead } from '@/lib/api-client';

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No leads found
              </td>
            </tr>
          )}
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">
                {lead.company_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">{lead.email ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{lead.score}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  lead.status === 'validated' ? 'bg-green-100 text-green-700' :
                  lead.status === 'synced' ? 'bg-blue-100 text-blue-700' :
                  lead.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  lead.status === 'duplicate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {lead.status}
                </span>
              </td>
              <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-400">
                <a href={lead.source_url} target="_blank" rel="noreferrer" className="hover:text-blue-500">
                  {lead.source_url}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
