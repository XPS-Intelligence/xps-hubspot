'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PromptEditor } from '@/components/PromptEditor';
import { promptsApi } from '@/lib/api-client';
import type { PromptInput } from '@/lib/api-client';

export default function PromptsPage() {
  const qc = useQueryClient();

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => promptsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PromptInput) => promptsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromptInput> }) =>
      promptsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promptsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prompt Library</h1>
        <p className="mt-1 text-sm text-gray-500">Manage LLM prompt templates</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white" style={{ minHeight: 500 }}>
          <div className="p-6 h-full">
            <PromptEditor
              prompts={prompts}
              onCreate={async (data) => { await createMutation.mutateAsync(data); }}
              onUpdate={async (id, data) => { await updateMutation.mutateAsync({ id, data }); }}
              onDelete={async (id) => { await deleteMutation.mutateAsync(id); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
