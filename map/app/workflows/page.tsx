'use client';

import { useState } from 'react';
import { useWorkflow } from '@/lib/WorkflowContext';

export default function WorkflowsPage() {
  const {
    workflows,
    selectedWorkflowId,
    selectWorkflow,
    loading,
    error,
    refreshWorkflows,
    createWorkflow,
  } = useWorkflow();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    setLocalError(null);
    try {
      const id = await createWorkflow(newName.trim(), newDescription.trim() || undefined);
      if (id) {
        setShowNewForm(false);
        setNewName('');
        setNewDescription('');
      }
    } catch (err) {
      setLocalError('Failed to create workflow');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (workflow: { id: number; workflow_name: string; description?: string }) => {
    setEditingId(workflow.id);
    setEditName(workflow.workflow_name);
    setEditDescription(workflow.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/workflows/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setLocalError(data.error);
        return;
      }

      await refreshWorkflows();
      setEditingId(null);
      setEditName('');
      setEditDescription('');
    } catch (err) {
      setLocalError('Failed to update workflow');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this workflow? All associated activities will also be deleted.')) {
      return;
    }

    setLocalError(null);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.error) {
        setLocalError(data.error);
        return;
      }

      await refreshWorkflows();
      if (selectedWorkflowId === id) {
        selectWorkflow(null);
      }
    } catch (err) {
      setLocalError('Failed to delete workflow');
      console.error(err);
    }
  };

  const displayError = localError || error;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Workflows</h1>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary px-4 py-2 rounded-md text-sm  transition-colors"
          >
            + New Workflow
          </button>
        )}
      </header>

      {/* New Workflow Form */}
      {showNewForm && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Create New Workflow</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Claims Processing"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="btn-primary px-4 py-1.5 rounded-md text-sm  transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewName('');
                setNewDescription('');
              }}
              className="text-gray-600 px-4 py-1.5 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {displayError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm">
          {displayError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading workflows...</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No workflows yet.</p>
            <p className="mt-2">Create a workflow to get started with process mapping.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-4 btn-primary px-4 py-2 rounded-md text-sm "
            >
              Create First Workflow
            </button>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl">
            {workflows.map((workflow) => {
              const isSelected = workflow.id === selectedWorkflowId;
              const isEditing = workflow.id === editingId;

              return (
                <div
                  key={workflow.id}
                  className={`bg-white rounded-lg shadow p-4 border-2 transition-colors ${
                    isSelected ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Workflow Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving || !editName.trim()}
                          className="btn-primary px-3 py-1 rounded text-sm  disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditName('');
                            setEditDescription('');
                          }}
                          className="text-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {workflow.workflow_name}
                          </h3>
                          {isSelected && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        {workflow.description && (
                          <p className="text-gray-600 text-sm mt-1">{workflow.description}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-2">
                          Created: {new Date(workflow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!isSelected && (
                          <button
                            onClick={() => selectWorkflow(workflow.id)}
                            className="btn-primary px-3 py-1 rounded text-sm "
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(workflow)}
                          className="text-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          className="text-red-600 px-3 py-1 rounded text-sm hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
