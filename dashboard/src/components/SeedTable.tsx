'use client';

import { useState } from 'react';
import { Search, Trash2, Play } from 'lucide-react';
import type { Seed } from '@/lib/api-client';

interface SeedTableProps {
  seeds: Seed[];
  onDelete: (id: string) => void;
  onDispatch: (id: string) => void;
}

export function SeedTable({ seeds, onDelete, onDispatch }: SeedTableProps) {
  const [search, setSearch] = useState('');

  const filtered = seeds.filter(
    (s) =>
      s.url.toLowerCase().includes(search.toLowerCase()) ||
      (s.industry ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.city ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search seeds…"
        />
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">URL</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Industry</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No seeds found
                </td>
              </tr>
            )}
            {filtered.map((seed) => (
              <tr key={seed.id} className="hover:bg-gray-50">
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-blue-600">
                  <a href={seed.url} target="_blank" rel="noreferrer">{seed.url}</a>
                </td>
                <td className="px-4 py-3 text-gray-600">{seed.industry ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {[seed.city, seed.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    seed.status === 'active' ? 'bg-green-100 text-green-700' :
                    seed.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {seed.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDispatch(seed.id)}
                      className="rounded p-1 text-blue-600 hover:bg-blue-50"
                      title="Dispatch pipeline"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(seed.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      title="Delete seed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
