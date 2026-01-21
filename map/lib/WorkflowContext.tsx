'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Workflow, SwimlaneConfig } from './types';

interface WorkflowContextType {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  selectedWorkflowId: number | null;
  selectWorkflow: (id: number | null) => void;
  swimlanes: SwimlaneConfig[];
  loading: boolean;
  error: string | null;
  refreshWorkflows: () => Promise<void>;
  refreshSwimlanes: () => Promise<void>;
  createWorkflow: (name: string, description?: string) => Promise<number | null>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [swimlanes, setSwimlanes] = useState<SwimlaneConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId) || null;

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setWorkflows(data.workflows || []);

      // Auto-select first workflow if none selected
      if (!selectedWorkflowId && data.workflows?.length > 0) {
        setSelectedWorkflowId(data.workflows[0].id);
      }
    } catch (err) {
      setError('Failed to fetch workflows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowId]);

  const fetchSwimlanes = useCallback(async () => {
    if (!selectedWorkflowId) {
      setSwimlanes([]);
      return;
    }

    try {
      const res = await fetch(`/api/swimlanes?workflowId=${selectedWorkflowId}`);
      const data = await res.json();

      if (data.error) {
        console.error('Failed to fetch swimlanes:', data.error);
        return;
      }

      setSwimlanes(data.swimlanes || []);
    } catch (err) {
      console.error('Failed to fetch swimlanes:', err);
    }
  }, [selectedWorkflowId]);

  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Fetch swimlanes when workflow changes
  useEffect(() => {
    fetchSwimlanes();
  }, [fetchSwimlanes]);

  // Save selected workflow to localStorage
  useEffect(() => {
    if (selectedWorkflowId) {
      localStorage.setItem('voyage-selected-workflow', String(selectedWorkflowId));
    }
  }, [selectedWorkflowId]);

  // Load selected workflow from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('voyage-selected-workflow');
    if (saved) {
      const id = parseInt(saved, 10);
      if (!isNaN(id)) {
        setSelectedWorkflowId(id);
      }
    }
  }, []);

  const selectWorkflow = (id: number | null) => {
    setSelectedWorkflowId(id);
  };

  const createWorkflow = async (name: string, description?: string): Promise<number | null> => {
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return null;
      }

      await fetchWorkflows();
      setSelectedWorkflowId(data.id);
      return data.id;
    } catch (err) {
      setError('Failed to create workflow');
      console.error(err);
      return null;
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflow,
        selectedWorkflowId,
        selectWorkflow,
        swimlanes,
        loading,
        error,
        refreshWorkflows: fetchWorkflows,
        refreshSwimlanes: fetchSwimlanes,
        createWorkflow,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
