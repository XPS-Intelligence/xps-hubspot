'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SeedInput } from '@/lib/api-client';

const SeedFormSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  keywords: z.string(),
  key_phrases: z.string(),
  categories: z.string(),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  industry: z.string().optional(),
  target_intent: z.string().optional(),
  desired_end_result: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']),
});

type SeedFormValues = z.infer<typeof SeedFormSchema>;

interface SeedFormProps {
  onSubmit: (data: SeedInput) => Promise<void>;
  defaultValues?: Partial<SeedFormValues>;
}

export function SeedForm({ onSubmit, defaultValues }: SeedFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SeedFormValues>({
    resolver: zodResolver(SeedFormSchema),
    defaultValues: { status: 'active', ...defaultValues },
  });

  const handleFormSubmit = async (values: SeedFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const data: SeedInput = {
        ...values,
        keywords: values.keywords ? values.keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        key_phrases: values.key_phrases ? values.key_phrases.split(',').map(s => s.trim()).filter(Boolean) : [],
        categories: values.categories ? values.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
        state: values.state ?? null,
        city: values.city ?? null,
        zip: values.zip ?? null,
        industry: values.industry ?? null,
        target_intent: values.target_intent ?? null,
        desired_end_result: values.desired_end_result ?? null,
      };
      await onSubmit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">URL *</label>
        <input
          {...register('url')}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com"
        />
        {errors.url && <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
          <input {...register('keywords')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="SaaS, B2B, startup" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Key Phrases (comma-separated)</label>
          <input {...register('key_phrases')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="looking to hire, series A" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Categories (comma-separated)</label>
        <input {...register('categories')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="tech, finance" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">State</label>
          <input {...register('state')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="CA" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input {...register('city')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="San Francisco" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ZIP</label>
          <input {...register('zip')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="94105" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Industry</label>
        <input {...register('industry')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Technology" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Target Intent</label>
        <input {...register('target_intent')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="hiring, funding, expansion" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Desired End Result</label>
        <textarea {...register('desired_end_result')} rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Generate qualified B2B leads for outreach" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select {...register('status')} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save Seed'}
      </button>
    </form>
  );
}
