"use client";

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodeSidebar } from './NodeSidebar';
import { nodeTypes, NodeType, getDefaultNodeData } from './node-types';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Play, Save, Download, Upload, Undo, Redo } from 'lucide-react';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface FlowEditorProps {
  agentId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onExecute?: () => void;
}

export function FlowEditor({ agentId, onSave, onExecute }: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (!data || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const { nodeType, nodeData } = JSON.parse(data);
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          ...getDefaultNodeData(nodeType as NodeType),
          ...nodeData,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    try {
      if (onExecute) {
        await onExecute();
      }
    } finally {
      setIsExecuting(false);
    }
  }, [onExecute]);

  const handleExport = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `agent-flow-${agentId || 'new'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges, reactFlowInstance, agentId]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target?.result as string);
        if (flowData.nodes) setNodes(flowData.nodes);
        if (flowData.edges) setEdges(flowData.edges);
        if (flowData.viewport && reactFlowInstance) {
          reactFlowInstance.setViewport(flowData.viewport);
        }
      } catch (error) {
        console.error('Failed to import flow:', error);
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, reactFlowInstance]);

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      <ReactFlowProvider>
        {/* Node Sidebar */}
        <NodeSidebar onNodeDragStart={() => {}} />

        {/* Main Flow Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-white">Flow Editor</h1>
                {agentId && (
                  <Badge variant="outline" className="text-xs">
                    Agent: {agentId}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Flow Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Redo className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-white/10 mx-2" />

                {/* Import/Export */}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-flow"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => document.getElementById('import-flow')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <div className="w-px h-6 bg-white/10 mx-2" />

                {/* Save & Execute */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="ai"
                  size="sm"
                  onClick={handleExecute}
                  disabled={isExecuting || nodes.length === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isExecuting ? 'Executing...' : 'Execute'}
                </Button>
              </div>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              className="bg-transparent"
              defaultEdgeOptions={{
                style: { stroke: '#64748b', strokeWidth: 2 },
                type: 'smoothstep',
              }}
            >
              <Background 
                color="#1e293b" 
                gap={20} 
                size={1}
                variant="dots"
              />
              <Controls 
                className="bg-gray-900/90 border border-white/10 rounded-lg"
                showInteractive={false}
              />
              <MiniMap 
                className="bg-gray-900/90 border border-white/10 rounded-lg"
                nodeColor="#64748b"
                maskColor="rgba(0, 0, 0, 0.2)"
              />
            </ReactFlow>
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
