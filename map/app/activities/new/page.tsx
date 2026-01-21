'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import ActivityForm from '@/components/ActivityForm';

function NewActivityContent() {
  const searchParams = useSearchParams();
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-800">New Activity</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No workflow selected.</p>
            <Link href="/activities" className="link-primary">
              Go back to Activities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/activities" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">New Activity</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <ActivityForm workflowId={parseInt(workflowId, 10)} />
        </div>
      </div>
    </div>
  );
}

export default function NewActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <NewActivityContent />
    </Suspense>
  );
}
