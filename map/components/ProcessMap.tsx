'use client';

import { useCallback, useMemo, useState } from 'react';
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
import DetailPanel from './DetailPanel';
import { Activity, SwimlaneConfig } from '@/lib/types';

interface ProcessMapProps {
  activities: Activity[];
  swimlanes: SwimlaneConfig[];
  onPositionUpdate?: (activityId: number, newGridLocation: string) => void;
}

// Grid spacing constants
const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 150;
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
};

export default function ProcessMap({ activities, swimlanes, onPositionUpdate }: ProcessMapProps) {
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

  // Convert activities to nodes
  const initialNodes: Node[] = useMemo(() => {
    return activities.map((activity) => {
      const pos = parseGridLocation(activity.grid_location);
      if (!pos) {
        return null;
      }

      const x = SWIMLANE_LABEL_WIDTH + pos.col * COLUMN_WIDTH;
      const y = PADDING_TOP + pos.row * ROW_HEIGHT;

      return {
        id: `activity-${activity.id}`,
        type: activity.activity_type === 'decision' ? 'decision' : 'activity',
        position: { x, y },
        data: {
          activity,
          onClick: setSelectedActivity,
        },
      };
    }).filter(Boolean) as Node[];
  }, [activities]);

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

        // Find target activity by grid location
        const targetActivity = activities.find(
          (a) => a.grid_location?.toUpperCase() === conn.next?.toUpperCase()
        );

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

  // Find the max row used for swimlane background
  const maxRow = useMemo(() => {
    let max = 0;
    activities.forEach((a) => {
      const pos = parseGridLocation(a.grid_location);
      if (pos && pos.row > max) max = pos.row;
    });
    return max;
  }, [activities]);

  // Generate swimlane background elements
  const swimlaneBackgrounds = useMemo(() => {
    const elements: React.ReactNode[] = [];

    for (let row = 0; row <= maxRow; row++) {
      const letter = String.fromCharCode('A'.charCodeAt(0) + row);
      const name = swimlaneNames[letter] || '';
      const y = PADDING_TOP + row * ROW_HEIGHT - ROW_HEIGHT / 2 + 40;

      // Swimlane label
      elements.push(
        <div
          key={`label-${letter}`}
          className="absolute text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded"
          style={{
            left: 10,
            top: y,
            width: SWIMLANE_LABEL_WIDTH - 20,
          }}
        >
          <span className="font-bold">{letter}</span>
          {name && <span className="text-gray-400 ml-1">- {name}</span>}
        </div>
      );

      // Swimlane divider line
      if (row > 0) {
        elements.push(
          <div
            key={`line-${letter}`}
            className="absolute border-t border-dashed border-gray-200"
            style={{
              left: 0,
              right: 0,
              top: PADDING_TOP + row * ROW_HEIGHT - ROW_HEIGHT / 2,
            }}
          />
        );
      }
    }

    return elements;
  }, [maxRow, swimlaneNames]);

  return (
    <div
      className="w-full h-full relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Swimlane labels overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {swimlaneBackgrounds}
      </div>

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
