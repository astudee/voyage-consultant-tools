'use client';

import { useEffect, useState } from 'react';
import { Workflow, SwimlaneConfig } from '@/lib/types';

const SWIMLANE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function SwimlanesPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [swimlanes, setSwimlanes] = useState<SwimlaneConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  // Fetch workflows on mount
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch('/api/workflows');
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setWorkflows(data.workflows || []);

        // Auto-select first workflow
        if (data.workflows?.length > 0 && !selectedWorkflowId) {
          setSelectedWorkflowId(data.workflows[0].id);
        }
      } catch (err) {
        setError('Failed to fetch workflows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [selectedWorkflowId]);

  // Fetch swimlanes when workflow changes
  useEffect(() => {
    if (!selectedWorkflowId) return;

    async function fetchSwimlanes() {
      setLoading(true);
      try {
        const res = await fetch(`/api/swimlanes?workflowId=${selectedWorkflowId}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setSwimlanes(data.swimlanes || []);

        // Initialize edited names from swimlanes
        const names: Record<string, string> = {};
        data.swimlanes?.forEach((s: SwimlaneConfig) => {
          names[s.swimlane_letter] = s.swimlane_name;
        });
        setEditedNames(names);
        setError(null);
      } catch (err) {
        setError('Failed to fetch swimlanes');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSwimlanes();
  }, [selectedWorkflowId]);

  const handleNameChange = (letter: string, name: string) => {
    setEditedNames((prev) => ({ ...prev, [letter]: name }));
  };

  const handleSave = async (letter: string) => {
    if (!selectedWorkflowId) return;

    setSaving(letter);
    try {
      const res = await fetch('/api/swimlanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          letter,
          name: editedNames[letter] || '',
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Update local swimlanes state
      setSwimlanes((prev) => {
        const existing = prev.find((s) => s.swimlane_letter === letter);
        if (existing) {
          return prev.map((s) =>
            s.swimlane_letter === letter
              ? { ...s, swimlane_name: editedNames[letter] || '' }
              : s
          );
        } else {
          return [
            ...prev,
            {
              swimlane_letter: letter,
              swimlane_name: editedNames[letter] || '',
              workflow_id: selectedWorkflowId,
            },
          ];
        }
      });
    } catch (err) {
      setError('Failed to save swimlane');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedWorkflowId) return;

    setSaving('all');
    try {
      for (const letter of SWIMLANE_LETTERS) {
        const name = editedNames[letter];
        if (name !== undefined) {
          await fetch('/api/swimlanes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowId: selectedWorkflowId,
              letter,
              name: name || '',
            }),
          });
        }
      }

      // Refresh swimlanes
      const res = await fetch(`/api/swimlanes?workflowId=${selectedWorkflowId}`);
      const data = await res.json();
      if (data.swimlanes) {
        setSwimlanes(data.swimlanes);
      }
    } catch (err) {
      setError('Failed to save swimlanes');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const getSwimlaneValue = (letter: string): string => {
    if (editedNames[letter] !== undefined) {
      return editedNames[letter];
    }
    const swimlane = swimlanes.find((s) => s.swimlane_letter === letter);
    return swimlane?.swimlane_name || '';
  };

  const hasChanges = (letter: string): boolean => {
    const currentValue = getSwimlaneValue(letter);
    const savedValue = swimlanes.find((s) => s.swimlane_letter === letter)?.swimlane_name || '';
    return currentValue !== savedValue;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Swimlane Configuration</h1>

          {/* Workflow selector */}
          <select
            value={selectedWorkflowId || ''}
            onChange={(e) => setSelectedWorkflowId(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Workflow --</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.workflow_name}
              </option>
            ))}
          </select>
        </div>

        {selectedWorkflowId && (
          <button
            onClick={handleSaveAll}
            disabled={saving === 'all'}
            className="btn-primary px-4 py-2 rounded-md text-sm  disabled:opacity-50"
          >
            {saving === 'all' ? 'Saving All...' : 'Save All Changes'}
          </button>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedWorkflowId ? (
          <div className="text-center py-12 text-gray-500">
            {workflows.length === 0 ? (
              <p>No workflows yet. Create a workflow first.</p>
            ) : (
              <p>Select a workflow to configure swimlanes.</p>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading swimlanes...</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Swimlane Names</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Name each swimlane (row) in your process map. Each workflow has its own swimlane
                  names.
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {SWIMLANE_LETTERS.map((letter) => (
                  <div
                    key={letter}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50"
                  >
                    <span className="w-8 text-lg font-bold text-gray-700">{letter}</span>
                    <input
                      type="text"
                      value={getSwimlaneValue(letter)}
                      onChange={(e) => handleNameChange(letter, e.target.value)}
                      placeholder="Click to name this swimlane"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSave(letter)}
                      disabled={saving === letter || !hasChanges(letter)}
                      className={`px-3 py-1.5 rounded text-sm ${
                        hasChanges(letter)
                          ? 'btn-primary '
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      {saving === letter ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Tips</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  - Swimlanes typically represent departments, roles, or systems (e.g., Mail
                  Room, Claims Processing)
                </li>
                <li>- You can leave swimlanes unnamed if not needed</li>
                <li>- Swimlane names are specific to each workflow</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
