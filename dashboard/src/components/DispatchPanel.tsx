'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { Seed, PipelineRun } from '@/lib/api-client';

interface DispatchPanelProps {
  seeds: Seed[];
  onDispatch: (seedIds: string[], triggerType: string) => Promise<PipelineRun>;
}

export function DispatchPanel({ seeds, onDispatch }: DispatchPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [triggerType, setTriggerType] = useState<string>('manual');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDispatch = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const run = await onDispatch(Array.from(selected), triggerType);
      setResult(run);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispatch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {result && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700">
          Pipeline run started: <span className="font-mono">{result.id}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Trigger Type</label>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="manual">Manual</option>
          <option value="api">API</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Seeds ({selected.size} selected)
        </label>
        <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
          {seeds.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">No seeds available</div>
          )}
          {seeds.map((seed) => (
            <label key={seed.id} className="flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.has(seed.id)}
                onChange={() => toggle(seed.id)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-mono text-blue-600 truncate max-w-xs">{seed.url}</div>
                <div className="text-xs text-gray-400">{seed.industry ?? ''} {seed.city ? `· ${seed.city}` : ''}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleDispatch}
        disabled={loading || selected.size === 0}
        className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
        {loading ? 'Dispatching…' : `Dispatch Pipeline (${selected.size} seed${selected.size !== 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
