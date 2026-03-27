'use client';

import { useRouter } from 'next/navigation';
import { SeedForm } from '@/components/SeedForm';
import { seedsApi } from '@/lib/api-client';
import type { SeedInput } from '@/lib/api-client';

export default function NewSeedPage() {
  const router = useRouter();

  const handleSubmit = async (data: SeedInput) => {
    await seedsApi.create(data);
    router.push('/seeds');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Seed</h1>
        <p className="mt-1 text-sm text-gray-500">Add a new scraping target</p>
      </div>
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <SeedForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
