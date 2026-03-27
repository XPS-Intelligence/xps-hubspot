'use client';

import { useState } from 'react';
import type { Prompt, PromptInput } from '@/lib/api-client';

interface PromptEditorProps {
  prompts: Prompt[];
  onCreate: (data: PromptInput) => Promise<void>;
  onUpdate: (id: string, data: Partial<PromptInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PromptEditor({ prompts, onCreate, onUpdate, onDelete }: PromptEditorProps) {
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [template, setTemplate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = (p: Prompt) => {
    setSelected(p);
    setCreating(false);
    setName(p.name);
    setCategory(p.category ?? '');
    setTemplate(p.template);
    setDescription(p.description ?? '');
  };

  const handleNew = () => {
    setSelected(null);
    setCreating(true);
    setName('');
    setCategory('');
    setTemplate('');
    setDescription('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (creating) {
        await onCreate({ name, category: category || null, template, description: description || null, variables: [], is_active: true, version: 1 });
      } else if (selected) {
        await onUpdate(selected.id, { category: category || null, template, description: description || null });
      }
      setCreating(false);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* List */}
      <div className="w-64 shrink-0 space-y-2">
        <button
          onClick={handleNew}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Prompt
        </button>
        <div className="space-y-1">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className={`w-full rounded px-3 py-2 text-left text-sm ${
                selected?.id === p.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium truncate">{p.name}</div>
              {p.category && <div className="text-xs text-gray-400">{p.category}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {(selected || creating) && (
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!selected}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="extraction, enrichment…"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Template *</label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
              placeholder="Write your prompt template here. Use {{variable}} for placeholders."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !name || !template}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            {selected && (
              <button
                onClick={async () => { await onDelete(selected.id); setSelected(null); }}
                className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {!selected && !creating && (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          Select a prompt or create a new one
        </div>
      )}
    </div>
  );
}
