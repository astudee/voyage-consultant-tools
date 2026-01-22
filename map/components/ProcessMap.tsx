'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ActivityNode from './ActivityNode';
import DecisionNode from './DecisionNode';
import SwimlaneLabel from './SwimlaneLabel';
import SwimlaneDivider from './SwimlaneDivider';
import DetailPanel from './DetailPanel';
import { Activity, SwimlaneConfig } from '@/lib/types';
import type { DisplayMode } from '@/app/page';

interface ProcessMapProps {
  activities: Activity[];
  swimlanes: SwimlaneConfig[];
  onPositionUpdate?: (activityId: number, newGridLocation: string) => void;
  displayMode?: DisplayMode;
}

// Grid spacing constants
const COLUMN_WIDTH = 250;
const ROW_HEIGHT = 180;
const SWIMLANE_LABEL_WIDTH = 150;
const PADDING_TOP = 50;

// Parse grid location (e.g., "A1" -> { row: 0, col: 0 })
function parseGridLocation(location: string): { row: number; col: number } | null {
  if (!location) return null;
  const match = location.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const number = parseInt(match[2], 10);

  // A=0, B=1, etc.
  const row = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  // Column 1 = index 0
  const col = number - 1;

  return { row, col };
}

// Custom node types
const nodeTypes = {
  activity: ActivityNode,
  decision: DecisionNode,
  swimlaneLabel: SwimlaneLabel,
  swimlaneDivider: SwimlaneDivider,
};


export default function ProcessMap({ activities, swimlanes, onPositionUpdate, displayMode = 'grid' }: ProcessMapProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ x: number; y: number } | null>(null);

  // Build swimlane name map
  const swimlaneNames = useMemo(() => {
    const map: Record<string, string> = {};
    swimlanes.forEach((s) => {
      map[s.swimlane_letter] = s.swimlane_name;
    });
    return map;
  }, [swimlanes]);

  // Find max column for divider width calculation
  const maxCol = useMemo(() => {
    let max = 10; // Minimum width
    activities.forEach((a) => {
      const pos = parseGridLocation(a.grid_location);
      if (pos && pos.col > max) max = pos.col;
    });
    return max + 5; // Add some padding
  }, [activities]);

  // Find all rows to display (union of activities and configured swimlanes)
  const rowsToDisplay = useMemo(() => {
    const rows = new Set<number>();
    activities.forEach((a) => {
      const pos = parseGridLocation(a.grid_location);
      if (pos) rows.add(pos.row);
    });
    swimlanes.forEach((s) => {
      const row = s.swimlane_letter.charCodeAt(0) - 'A'.charCodeAt(0);
      if (row >= 0 && row <= 25) rows.add(row);
    });
    return Array.from(rows).sort((a, b) => a - b);
  }, [activities, swimlanes]);

  const maxRow = useMemo(() => {
    return rowsToDisplay.length > 0 ? Math.max(...rowsToDisplay) : 0;
  }, [rowsToDisplay]);

  // Convert activities to nodes, including swimlane labels and dividers
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // Add swimlane labels and dividers (rendered first, so they appear behind activities)
    for (let row = 0; row <= maxRow; row++) {
      const letter = String.fromCharCode('A'.charCodeAt(0) + row);
      const name = swimlaneNames[letter] || '';
      const y = PADDING_TOP + row * ROW_HEIGHT;

      // Swimlane label
      nodes.push({
        id: `swimlane-label-${letter}`,
        type: 'swimlaneLabel',
        position: { x: 10, y: y - 12 },
        data: { letter, name },
        draggable: false,
        selectable: false,
        connectable: false,
      });

      // Swimlane divider (between rows, starting from row 1)
      if (row > 0) {
        nodes.push({
          id: `swimlane-divider-${letter}`,
          type: 'swimlaneDivider',
          position: { x: 0, y: PADDING_TOP + row * ROW_HEIGHT - ROW_HEIGHT / 2 },
          data: { width: maxCol * COLUMN_WIDTH + SWIMLANE_LABEL_WIDTH + 200 },
          draggable: false,
          selectable: false,
          connectable: false,
        });
      }
    }

    // Add bottom divider
    if (maxRow >= 0) {
      const bottomLetter = String.fromCharCode('A'.charCodeAt(0) + maxRow + 1);
      nodes.push({
        id: `swimlane-divider-${bottomLetter}`,
        type: 'swimlaneDivider',
        position: { x: 0, y: PADDING_TOP + (maxRow + 1) * ROW_HEIGHT - ROW_HEIGHT / 2 },
        data: { width: maxCol * COLUMN_WIDTH + SWIMLANE_LABEL_WIDTH + 200 },
        draggable: false,
        selectable: false,
        connectable: false,
      });
    }

    // Add activity nodes
    activities.forEach((activity) => {
      const pos = parseGridLocation(activity.grid_location);
      if (!pos) return;

      const x = SWIMLANE_LABEL_WIDTH + pos.col * COLUMN_WIDTH;
      const y = PADDING_TOP + pos.row * ROW_HEIGHT;

      nodes.push({
        id: `activity-${activity.id}`,
        type: activity.activity_type === 'decision' ? 'decision' : 'activity',
        position: { x, y },
        data: {
          activity,
          onClick: setSelectedActivity,
          displayMode,
        },
      });
    });

    return nodes;
  }, [activities, maxRow, maxCol, swimlaneNames, displayMode]);

  // Convert connections to edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    activities.forEach((activity) => {
      if (!activity.connections) return;

      let connections: Array<{ condition?: string; next?: string }> = [];
      try {
        connections = JSON.parse(activity.connections);
      } catch {
        return;
      }

      connections.forEach((conn, idx) => {
        if (!conn.next) return;

        // First try to find target activity by exact grid location
        let targetActivity = activities.find(
          (a) => a.grid_location?.toUpperCase() === conn.next?.toUpperCase()
        );

        // If no exact match found, try to find the first activity in the target swimlane
        if (!targetActivity) {
          const targetLetter = conn.next?.match(/^[A-Z]/i)?.[0]?.toUpperCase();
          if (targetLetter) {
            // Find all activities in that swimlane and get the one with the lowest step number
            const swimlaneActivities = activities
              .filter((a) => a.grid_location?.toUpperCase().startsWith(targetLetter))
              .sort((a, b) => {
                const aStep = parseInt(a.grid_location?.match(/\d+/)?.[0] || '999', 10);
                const bStep = parseInt(b.grid_location?.match(/\d+/)?.[0] || '999', 10);
                return aStep - bStep;
              });
            targetActivity = swimlaneActivities[0];
          }
        }

        if (!targetActivity) return;

        const edgeId = `edge-${activity.id}-${targetActivity.id}-${idx}`;

        // Determine source handle for decisions
        let sourceHandle: string | undefined;
        if (activity.activity_type === 'decision') {
          // Try to route based on target position relative to source
          const sourcePos = parseGridLocation(activity.grid_location);
          const targetPos = parseGridLocation(targetActivity.grid_location);

          if (sourcePos && targetPos) {
            if (targetPos.row > sourcePos.row) {
              sourceHandle = 'bottom';
            } else if (targetPos.row < sourcePos.row) {
              sourceHandle = 'top';
            } else {
              sourceHandle = 'right';
            }
          }
        }

        edges.push({
          id: edgeId,
          source: `activity-${activity.id}`,
          target: `activity-${targetActivity.id}`,
          sourceHandle,
          label: conn.condition || undefined,
          labelStyle: { fontSize: 10, fill: '#666' },
          labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
          },
          style: { strokeWidth: 2 },
        });
      });
    });

    return edges;
  }, [activities]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when displayMode or activities change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Convert screen position to grid location
  const positionToGridLocation = (x: number, y: number): string | null => {
    const col = Math.round((x - SWIMLANE_LABEL_WIDTH) / COLUMN_WIDTH);
    const row = Math.round((y - PADDING_TOP) / ROW_HEIGHT);

    if (col < 0 || row < 0 || row > 25) return null;

    const letter = String.fromCharCode('A'.charCodeAt(0) + row);
    const number = col + 1;
    return `${letter}${number}`;
  };

  // Handle node drag end to update position
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (!onPositionUpdate) return;

    const newGridLocation = positionToGridLocation(node.position.x, node.position.y);
    if (!newGridLocation) return;

    // Extract activity ID from node ID (format: "activity-123")
    const activityId = parseInt(node.id.replace('activity-', ''), 10);
    if (isNaN(activityId)) return;

    // Find the activity to get its current grid location
    const activity = activities.find(a => a.id === activityId);
    if (!activity || activity.grid_location === newGridLocation) return;

    onPositionUpdate(activityId, newGridLocation);
  }, [activities, onPositionUpdate]);

  // Handle drop from unassigned sidebar
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDropIndicator(null);

    if (!onPositionUpdate) return;

    const activityId = event.dataTransfer.getData('activity-id');
    const swimlane = event.dataTransfer.getData('activity-swimlane');

    if (!activityId || !swimlane) return;

    // Get drop position relative to the map container
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    // Calculate column (step number)
    const col = Math.max(1, Math.round((x - SWIMLANE_LABEL_WIDTH) / COLUMN_WIDTH) + 1);

    // Create new grid location preserving the swimlane letter
    const newGridLocation = `${swimlane}${col}`;

    onPositionUpdate(parseInt(activityId, 10), newGridLocation);
  }, [onPositionUpdate]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    setDropIndicator({ x, y });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null);
  }, []);

  return (
    <div
      className="w-full h-full relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drop indicator */}
      {dropIndicator && (
        <div
          className="absolute w-40 h-20 border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-50 rounded-lg pointer-events-none z-20"
          style={{
            left: dropIndicator.x - 80,
            top: dropIndicator.y - 40,
          }}
        />
      )}

      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        nodesDraggable={!!onPositionUpdate}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#f0f0f0" gap={20} />
        <Controls />
      </ReactFlow>

      {/* Detail panel */}
      <DetailPanel
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
