'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from '@tanstack/react-table';
import type {
  TimeStudy,
  TimeStudyActivity,
  TimeStudyOutcome,
  TimeStudyFlag,
  TimeStudySession
} from '@/lib/time-study-types';
import { formatDuration } from '@/lib/time-study-types';

interface ObservationRow {
  id: number;
  session_id: number;
  session_observer_name: string;
  session_observed_worker: string | null;
  session_date: string;
  study_activity_id: number | null;
  activity_name: string | null;
  adhoc_activity_name: string | null;
  observation_number: number;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds: number | null;
  call_duration_seconds: number | null;
  acw_duration_seconds: number | null;
  outcome_id: number | null;
  outcome_name: string | null;
  notes: string | null;
  opportunity: string | null;
  created_at: string | null;
  flag_ids: number[];
  flag_names: string[];
}

interface StudyConfig {
  study: TimeStudy;
  activities: TimeStudyActivity[];
  outcomes: TimeStudyOutcome[];
  flags: TimeStudyFlag[];
  sessions: TimeStudySession[];
}

const columnHelper = createColumnHelper<ObservationRow>();

export default function DataGridPage() {
  const params = useParams();
  const studyId = params.studyId as string;

  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal state
  const [editingRow, setEditingRow] = useState<ObservationRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [obsRes, studyRes, activitiesRes, outcomesRes, flagsRes, sessionsRes] = await Promise.all([
        fetch(`/api/time-study/studies/${studyId}/observations`),
        fetch(`/api/time-study/studies/${studyId}`),
        fetch(`/api/time-study/studies/${studyId}/activities`),
        fetch(`/api/time-study/studies/${studyId}/outcomes`),
        fetch(`/api/time-study/studies/${studyId}/flags`),
        fetch(`/api/time-study/studies/${studyId}/sessions`),
      ]);

      const [obsData, studyData, activitiesData, outcomesData, flagsData, sessionsData] = await Promise.all([
        obsRes.json(),
        studyRes.json(),
        activitiesRes.json(),
        outcomesRes.json(),
        flagsRes.json(),
        sessionsRes.json(),
      ]);

      if (studyData.error) throw new Error(studyData.error);

      setObservations(obsData.observations || []);
      setConfig({
        study: studyData.study,
        activities: activitiesData.activities || [],
        outcomes: outcomesData.outcomes || [],
        flags: flagsData.flags || [],
        sessions: sessionsData.sessions || [],
      });
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delete handlers
  const handleDeleteSelected = async () => {
    const selectedIds = Object.keys(rowSelection).map(
      (idx) => observations[parseInt(idx)].id
    );

    if (selectedIds.length === 0) return;

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/observations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation_ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Failed to delete observations');

      setRowSelection({});
      setShowDeleteConfirm(false);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete observations');
    }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this observation?')) return;

    try {
      const res = await fetch(`/api/time-study/observations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete observation');
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete observation');
    }
  };

  // Determine if this is a Contact Center study
  const isContactCenter = config?.study.structure_type === 'phases';

  // Column definitions - dynamic based on study type
  const columns = useMemo(
    () => {
      const baseColumns = [
        columnHelper.display({
          id: 'select',
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              className="rounded border-gray-300"
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="rounded border-gray-300"
            />
          ),
          size: 40,
        }),
        columnHelper.accessor('id', {
          header: 'Ob',
          cell: (info) => (
            <span className="font-mono text-gray-500">{info.getValue()}</span>
          ),
          size: 60,
        }),
        columnHelper.accessor('session_date', {
          header: 'Date',
          cell: (info) => {
            const date = info.getValue();
            if (!date) return <span className="text-gray-500">--</span>;
            return (
              <span className="text-sm text-gray-600">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            );
          },
          size: 80,
        }),
        columnHelper.accessor('session_observer_name', {
          header: 'Observer',
          cell: (info) => (
            <span className="text-sm">{info.getValue()}</span>
          ),
          filterFn: 'includesString',
        }),
        columnHelper.accessor('session_observed_worker', {
          header: 'Observed',
          cell: (info) => {
            const worker = info.getValue();
            if (!worker) return <span className="text-gray-500">--</span>;
            return <span className="text-sm">{worker}</span>;
          },
          filterFn: 'includesString',
        }),
      ];

      // Duration columns - different for Contact Center vs Simple
      const durationColumns = isContactCenter
        ? [
            columnHelper.accessor('call_duration_seconds', {
              header: 'Call',
              cell: (info) => (
                <span className="font-mono text-sm text-blue-600">
                  {formatDuration(info.getValue())}
                </span>
              ),
              sortingFn: 'basic',
            }),
            columnHelper.accessor('acw_duration_seconds', {
              header: 'ACW',
              cell: (info) => {
                const acw = info.getValue();
                if (acw == null) return <span className="text-gray-500">--</span>;
                return (
                  <span className="font-mono text-sm text-orange-600">
                    {formatDuration(acw)}
                  </span>
                );
              },
              sortingFn: 'basic',
            }),
            columnHelper.accessor('total_duration_seconds', {
              header: 'AHT',
              cell: (info) => (
                <span className="font-mono text-sm">
                  {formatDuration(info.getValue())}
                </span>
              ),
              sortingFn: 'basic',
            }),
          ]
        : [
            columnHelper.accessor('total_duration_seconds', {
              header: 'Duration',
              cell: (info) => (
                <span className="font-mono text-sm">
                  {formatDuration(info.getValue())}
                </span>
              ),
              sortingFn: 'basic',
            }),
          ];

      const remainingColumns = [
        columnHelper.accessor('activity_name', {
          header: 'Activity',
          cell: (info) => (
            <span className="text-sm truncate max-w-[200px] block" title={info.getValue() || ''}>
              {info.getValue() || <span className="text-gray-500 italic">Not coded</span>}
            </span>
          ),
          filterFn: 'includesString',
        }),
        columnHelper.accessor('outcome_name', {
          header: 'Outcome',
          cell: (info) => {
            const outcome = info.getValue();
            if (!outcome) return <span className="text-gray-500">--</span>;

            const colors: Record<string, string> = {
              Complete: 'bg-green-100 text-green-700',
              Transferred: 'bg-yellow-100 text-yellow-700',
              Pended: 'bg-orange-100 text-orange-700',
            };

            return (
              <span className={`text-xs px-2 py-0.5 rounded ${colors[outcome] || 'bg-gray-100 text-gray-700'}`}>
                {outcome}
              </span>
            );
          },
          filterFn: 'equals',
        }),
        columnHelper.accessor('flag_names', {
          header: 'Flags',
          cell: (info) => {
            const flags = info.getValue();
            if (!flags || flags.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-1">
                {flags.map((flag, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {flag}
                  </span>
                ))}
              </div>
            );
          },
          enableSorting: false,
        }),
        columnHelper.accessor('notes', {
          header: 'Notes',
          cell: (info) => {
            const notes = info.getValue();
            if (!notes) return null;
            return (
              <span className="text-sm text-gray-600 truncate max-w-[150px] block" title={notes}>
                {notes}
              </span>
            );
          },
          enableSorting: false,
        }),
        columnHelper.accessor('opportunity', {
          header: 'Opportunity',
          cell: (info) => {
            const opportunity = info.getValue();
            if (!opportunity) return null;
            return (
              <span className="text-sm text-purple-600 truncate max-w-[150px] block" title={opportunity}>
                {opportunity}
              </span>
            );
          },
          enableSorting: false,
        }),
        columnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingRow(row.original)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteSingle(row.original.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          ),
          size: 100,
        }),
      ];

      return [...baseColumns, ...durationColumns, ...remainingColumns];
    },
    [isContactCenter]
  );

  const table = useReactTable({
    data: observations,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading observations...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error || 'Study not found'}</p>
          <Link href="/time-study" className="text-blue-600 hover:underline mt-4 block">
            Back to Studies
          </Link>
        </div>
      </div>
    );
  }

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/time-study" className="hover:text-gray-700">Time Studies</Link>
          <span>/</span>
          <Link href={`/time-study/${studyId}/summary`} className="hover:text-gray-700">
            {config.study.study_name}
          </Link>
          <span>/</span>
          <span className="text-gray-700">Data</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Observation Data</h1>
          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Delete Selected ({selectedCount})
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-4 py-2 rounded-md text-sm"
            >
              Add Observation
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64"
          />

          <select
            value={(columnFilters.find(f => f.id === 'session_observer_name')?.value as string) || ''}
            onChange={(e) => {
              const value = e.target.value;
              setColumnFilters(prev => {
                const others = prev.filter(f => f.id !== 'session_observer_name');
                return value ? [...others, { id: 'session_observer_name', value }] : others;
              });
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">All Observers</option>
            {[...new Set(observations.map(o => o.session_observer_name))].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={(columnFilters.find(f => f.id === 'activity_name')?.value as string) || ''}
            onChange={(e) => {
              const value = e.target.value;
              setColumnFilters(prev => {
                const others = prev.filter(f => f.id !== 'activity_name');
                return value ? [...others, { id: 'activity_name', value }] : others;
              });
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">All Activities</option>
            {config.activities.map(a => (
              <option key={a.id} value={a.activity_name}>{a.activity_name}</option>
            ))}
          </select>

          <select
            value={(columnFilters.find(f => f.id === 'outcome_name')?.value as string) || ''}
            onChange={(e) => {
              const value = e.target.value;
              setColumnFilters(prev => {
                const others = prev.filter(f => f.id !== 'outcome_name');
                return value ? [...others, { id: 'outcome_name', value }] : others;
              });
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">All Outcomes</option>
            {config.outcomes.map(o => (
              <option key={o.id} value={o.outcome_name}>{o.outcome_name}</option>
            ))}
          </select>

          {columnFilters.length > 0 && (
            <button
              onClick={() => setColumnFilters([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
          )}

          <span className="text-sm text-gray-500 ml-auto">
            {table.getFilteredRowModel().rows.length} of {observations.length} observations
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${
                            header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && ' ^'}
                          {header.column.getIsSorted() === 'desc' && ' v'}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    row.getIsSelected() ? 'bg-blue-50' : ''
                  } hover:bg-gray-100`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {observations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No observations recorded yet.</p>
              <p className="text-sm mt-2">Start a session to begin collecting data, or add observations manually.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {observations.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Last
              </button>
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRow && (
        <EditObservationModal
          observation={editingRow}
          config={config}
          onClose={() => setEditingRow(null)}
          onSave={async (data) => {
            try {
              const res = await fetch(`/api/time-study/observations/${editingRow.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error('Failed to update observation');
              setEditingRow(null);
              await loadData();
            } catch (err) {
              console.error('Update error:', err);
              alert('Failed to update observation');
            }
          }}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddObservationModal
          studyId={studyId}
          config={config}
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            try {
              const res = await fetch(`/api/time-study/studies/${studyId}/observations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error('Failed to create observation');
              setShowAddModal(false);
              await loadData();
            } catch (err) {
              console.error('Create error:', err);
              alert('Failed to create observation');
            }
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedCount} observation{selectedCount !== 1 ? 's' : ''}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Modal Component
function EditObservationModal({
  observation,
  config,
  onClose,
  onSave,
}: {
  observation: ObservationRow;
  config: StudyConfig;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [activityId, setActivityId] = useState<number | null>(observation.study_activity_id);
  const [adhocName, setAdhocName] = useState(observation.adhoc_activity_name || '');
  const [outcomeId, setOutcomeId] = useState<number | null>(observation.outcome_id);
  const [flagIds, setFlagIds] = useState<number[]>(observation.flag_ids);
  const [notes, setNotes] = useState(observation.notes || '');
  const [opportunity, setOpportunity] = useState(observation.opportunity || '');
  const [durationSeconds, setDurationSeconds] = useState<number | null>(observation.total_duration_seconds);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      study_activity_id: activityId,
      adhoc_activity_name: adhocName || null,
      outcome_id: outcomeId,
      flag_ids: flagIds,
      notes: notes || null,
      opportunity: opportunity || null,
      total_duration_seconds: durationSeconds,
    });
    setSaving(false);
  };

  const toggleFlag = (flagId: number) => {
    setFlagIds(prev =>
      prev.includes(flagId)
        ? prev.filter(id => id !== flagId)
        : [...prev, flagId]
    );
  };

  // Parse duration for editing
  const durationMinutes = durationSeconds ? Math.floor(durationSeconds / 60) : 0;
  const durationSecs = durationSeconds ? Math.round(durationSeconds % 60) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Observation #{observation.id}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select
              value={activityId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setActivityId(val ? parseInt(val) : null);
                if (val) setAdhocName('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select activity...</option>
              {config.activities.map(a => (
                <option key={a.id} value={a.id}>{a.activity_name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter ad-hoc activity name"
              value={adhocName}
              onChange={(e) => {
                setAdhocName(e.target.value);
                if (e.target.value) setActivityId(null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mt-2"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value) || 0;
                  setDurationSeconds(mins * 60 + durationSecs);
                }}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">min</span>
              <input
                type="number"
                min="0"
                max="59"
                value={durationSecs}
                onChange={(e) => {
                  const secs = parseInt(e.target.value) || 0;
                  setDurationSeconds(durationMinutes * 60 + secs);
                }}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">sec</span>
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select
              value={outcomeId || ''}
              onChange={(e) => setOutcomeId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select outcome...</option>
              {config.outcomes.map(o => (
                <option key={o.id} value={o.id}>{o.outcome_name}</option>
              ))}
            </select>
          </div>

          {/* Flags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flags</label>
            <div className="flex flex-wrap gap-2">
              {config.flags.map(flag => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => toggleFlag(flag.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    flagIds.includes(flag.id)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {flag.flag_name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Additional notes..."
            />
          </div>

          {/* Opportunity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Improvement Opportunity</label>
            <textarea
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Describe any improvement opportunity..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Modal Component
function AddObservationModal({
  studyId,
  config,
  onClose,
  onSave,
}: {
  studyId: string;
  config: StudyConfig;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [sessionId, setSessionId] = useState<number | null>(config.sessions[0]?.id || null);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [adhocName, setAdhocName] = useState('');
  const [outcomeId, setOutcomeId] = useState<number | null>(null);
  const [flagIds, setFlagIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      alert('Please select a session');
      return;
    }

    const totalSeconds = durationMinutes * 60 + durationSeconds;
    const now = new Date().toISOString();

    setSaving(true);
    await onSave({
      session_id: sessionId,
      study_activity_id: activityId,
      adhoc_activity_name: adhocName || null,
      started_at: now,
      ended_at: now,
      total_duration_seconds: totalSeconds || null,
      outcome_id: outcomeId,
      flag_ids: flagIds,
      notes: notes || null,
      opportunity: opportunity || null,
    });
    setSaving(false);
  };

  const toggleFlag = (flagId: number) => {
    setFlagIds(prev =>
      prev.includes(flagId)
        ? prev.filter(id => id !== flagId)
        : [...prev, flagId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Observation</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session *</label>
            <select
              value={sessionId || ''}
              onChange={(e) => setSessionId(e.target.value ? parseInt(e.target.value) : null)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select session...</option>
              {config.sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.observer_name} - {new Date(s.session_date).toLocaleDateString()}
                  {s.observed_worker_name ? ` (${s.observed_worker_name})` : ''}
                </option>
              ))}
            </select>
            {config.sessions.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                No sessions available. <Link href={`/time-study/${studyId}/session/new`} className="underline">Create a session first</Link>.
              </p>
            )}
          </div>

          {/* Activity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select
              value={activityId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setActivityId(val ? parseInt(val) : null);
                if (val) setAdhocName('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select activity...</option>
              {config.activities.map(a => (
                <option key={a.id} value={a.id}>{a.activity_name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter ad-hoc activity name"
              value={adhocName}
              onChange={(e) => {
                setAdhocName(e.target.value);
                if (e.target.value) setActivityId(null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mt-2"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">min</span>
              <input
                type="number"
                min="0"
                max="59"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">sec</span>
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select
              value={outcomeId || ''}
              onChange={(e) => setOutcomeId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select outcome...</option>
              {config.outcomes.map(o => (
                <option key={o.id} value={o.id}>{o.outcome_name}</option>
              ))}
            </select>
          </div>

          {/* Flags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flags</label>
            <div className="flex flex-wrap gap-2">
              {config.flags.map(flag => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => toggleFlag(flag.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    flagIds.includes(flag.id)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {flag.flag_name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Additional notes..."
            />
          </div>

          {/* Opportunity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Improvement Opportunity</label>
            <textarea
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Describe any improvement opportunity..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !sessionId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Observation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
