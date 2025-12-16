import React, { useState, useRef, useEffect } from 'react';
import { Play, Plus, Settings, X, ChevronDown, ChevronUp, Move, Trash2, Save, RefreshCw, Search, Filter } from 'lucide-react';

// Define node and edge types for the workflow (reference n8n data structure)
export interface WorkflowNode {
  id: string;
  type: 'input' | 'output' | 'gemini' | 'chat' | 'nanobanana_image' | 'nanobanana_edit' | 'veo_video' | 'keling_o1_edit';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    parameters?: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
    output?: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    label?: string;
    type?: string;
  };
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface VibeAgentWorkflowViewProps {
  onBack?: () => void;
}

const VibeAgentWorkflowView: React.FC<VibeAgentWorkflowViewProps> = ({ onBack }) => {
  // Workflow state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNodeLibraryOpen, setIsNodeLibraryOpen] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectionStart, setConnectionStart] = useState<{ 
    nodeId: string; 
    position: { x: number; y: number }; 
    previewPosition?: { x: number; y: number } 
  } | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  
  // Canvas state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasStart, setCanvasStart] = useState({ x: 0, y: 0 });
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });
  
  // Node library categories
  const nodeCategories = [
    {
      name: 'AI 助手',
      nodes: [
        { type: 'gemini', label: 'Gemini AI', description: 'Google Gemini 智能助手', icon: '🤖' },
        { type: 'chat', label: '对话生成', description: '智能对话与内容生成', icon: '💬' }
      ]
    },
    {
      name: '图片处理',
      nodes: [
        { type: 'nanobanana_image', label: '图片生成', description: 'Nanobanana 图片生成', icon: '🖼️' },
        { type: 'nanobanana_edit', label: '图片编辑', description: 'Nanobanana 图片编辑', icon: '✏️' }
      ]
    },
    {
      name: '视频处理',
      nodes: [
        { type: 'veo_video', label: '视频生成', description: 'VEO 视频生成', icon: '🎬' },
        { type: 'keling_o1_edit', label: '视频编辑', description: 'Keling-O1 视频编辑', icon: '🎞️' }
      ]
    },
    {
      name: '流程控制',
      nodes: [
        { type: 'input', label: '输入节点', description: '工作流输入', icon: '📥' },
        { type: 'output', label: '输出节点', description: '工作流输出', icon: '📤' }
      ]
    }
  ];
  
  // Add a new node to the workflow
  const addNode = (type: WorkflowNode['type'], position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {
        label: getNodeLabel(type),
        status: 'idle',
        parameters: getDefaultParameters(type)
      }
    };
    
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };
  
  // Get default label for node type
  const getNodeLabel = (type: WorkflowNode['type']): string => {
    const nodeDef = nodeCategories.flatMap(cat => cat.nodes).find(n => n.type === type);
    return nodeDef?.label || type;
  };
  
  // Get default parameters for node type
  const getDefaultParameters = (type: WorkflowNode['type']): Record<string, any> => {
    switch (type) {
      case 'gemini':
        return { model: 'gemini-3-pro', temperature: 0.7, maxTokens: 2048 };
      case 'chat':
        return { model: 'default-chat', systemPrompt: 'You are a helpful assistant.' };
      case 'nanobanana_image':
        return { model: 'nano-banana-pro', aspectRatio: '16:9', style: 'realistic' };
      case 'nanobanana_edit':
        return { model: 'nano-banana-edit', strength: 0.7 };
      case 'veo_video':
        return { model: 'veo3.1-fast', duration: 10, aspectRatio: '16:9' };
      case 'keling_o1_edit':
        return { model: 'keling-o1', resolution: '1080p' };
      case 'input':
        return { type: 'text', value: '' };
      case 'output':
        return { type: 'text' };
      default:
        return {};
    }
  };
  
  // Handle node drag start
  const handleNodeDragStart = (nodeId: string, clientX: number, clientY: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setIsDraggingNode(true);
      setDragOffset({ x: clientX - node.position.x, y: clientY - node.position.y });
    }
  };
  
  // Handle node drag end
  const handleNodeDragEnd = () => {
    setIsDraggingNode(false);
  };
  
  // Handle connection start
  const handleConnectionStart = (nodeId: string, clientX: number, clientY: number) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      // 使用绝对位置，不考虑缩放，确保连接点精确
      setConnectionStart({
        nodeId,
        position: {
          x: clientX - rect.left,
          y: clientY - rect.top
        }
      });
      setIsConnecting(true);
    }
  };
  
  // Handle connection end
  const handleConnectionEnd = (targetNodeId: string) => {
    if (connectionStart && connectionStart.nodeId !== targetNodeId) {
      // Check if connection already exists
      const connectionExists = edges.some(edge => 
        edge.source === connectionStart.nodeId && edge.target === targetNodeId
      );
      
      if (!connectionExists) {
        const newEdge: WorkflowEdge = {
          id: `edge-${Date.now()}`,
          source: connectionStart.nodeId,
          target: targetNodeId,
          data: {
            label: '连接',
            type: 'success'
          }
        };
        setEdges([...edges, newEdge]);
      }
    }
    setIsConnecting(false);
    setConnectionStart(null);
  };
  
  // Handle node mouse enter during connection
  const handleNodeMouseEnterDuringConnection = (targetNodeId: string) => {
    // Preview connection to this node
  };
  
  // Handle node mouse leave during connection
  const handleNodeMouseLeaveDuringConnection = () => {
    // Remove preview connection
  };
  
  // Handle canvas mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingNode && selectedNode && canvasRef.current) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      // 修复拖动同步问题：移除缩放除法，使用绝对位置
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      setNodes(nodes.map(node => 
        node.id === selectedNode.id 
          ? { ...node, position: { x, y } } 
          : node
      ));
      
      setSelectedNode(prev => prev ? { ...prev, position: { x, y } } : null);
    }
    
    // Update connection preview if connecting
    if (isConnecting && connectionStart && canvasRef.current) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      // 更新连接预览位置，跟随鼠标移动
      setConnectionStart(prev => prev ? {
        ...prev,
        previewPosition: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      } : null);
    }
  };
  
  // Handle mouse up on canvas
  const handleCanvasMouseUp = () => {
    setIsConnecting(false);
    setConnectionStart(null);
  };
  
  // Handle node selection
  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
  };
  
  // Delete a node
  const deleteNode = (nodeId: string) => {
    // Remove node and all connected edges
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };
  
  // Add an edge between nodes
  const addEdge = (source: string, target: string) => {
    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      source,
      target
    };
    setEdges([...edges, newEdge]);
  };
  
  // Delete an edge
  const deleteEdge = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId));
  };
  
  // Run the workflow
  const runWorkflow = () => {
    setWorkflowStatus('running');
    
    // Simulate workflow execution
    setTimeout(() => {
      // Update all nodes to success status
      setNodes(nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: 'success',
          output: `Output from ${node.data.label}`
        }
      })));
      setWorkflowStatus('completed');
    }, 2000);
  };
  
  // Clear the workflow
  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowStatus('idle');
  };
  
  // Handle canvas panning start
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只有当点击画布空白区域或非交互元素时才允许拖动
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setCanvasStart(canvasPosition);
    }
  };
  
  // Handle canvas panning move
  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      e.preventDefault();
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      
      setCanvasPosition({
        x: canvasStart.x + dx,
        y: canvasStart.y + dy
      });
    }
  };
  
  // Handle canvas panning end
  const handlePanEnd = () => {
    setIsPanning(false);
  };
  
  // Handle zoom with mouse position as center
  const handleZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the mouse position relative to the canvas content
    const mouseXRelative = (mouseX - canvasPosition.x) / zoom;
    const mouseYRelative = (mouseY - canvasPosition.y) / zoom;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = zoom * delta;
    
    // Calculate new canvas position to keep mouse at same content position
    const newCanvasX = mouseX - mouseXRelative * newZoom;
    const newCanvasY = mouseY - mouseYRelative * newZoom;
    
    setZoom(newZoom);
    setCanvasPosition({ x: newCanvasX, y: newCanvasY });
    setZoomCenter({ x: mouseX, y: mouseY });
  };
  
  // Render node connector handles
  const renderNodeHandles = (node: WorkflowNode) => {
    return (
      <>
        {/* Output handle (right side) */}
        <div 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-blue-500 rounded-r cursor-pointer hover:bg-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            // Handle connection start (would integrate with a proper edge creation system)
            console.log('Start connection from', node.id);
          }}
        />
        
        {/* Input handle (left side) */}
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-green-500 rounded-l cursor-pointer hover:bg-green-600"
          onClick={(e) => {
            e.stopPropagation();
            // Handle connection end (would integrate with a proper edge creation system)
            console.log('End connection to', node.id);
          }}
        />
      </>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 bg-[#171717] border-b border-[#262626] flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 rounded-md hover:bg-[#262626] transition-colors"
          >
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">VibeAgent 工作流</h1>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${workflowStatus === 'running' ? 'bg-yellow-500 text-black' : workflowStatus === 'success' ? 'bg-green-500 text-black' : workflowStatus === 'error' ? 'bg-red-500 text-black' : 'bg-gray-600 text-gray-200'}`}>
            {workflowStatus === 'running' ? '运行中' : workflowStatus === 'success' ? '已完成' : workflowStatus === 'error' ? '错误' : '就绪'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNodeLibraryOpen(!isNodeLibraryOpen)} 
            className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            添加节点
          </button>
          
          <button 
            onClick={saveWorkflow} 
            className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            保存
          </button>
          
          <button 
            onClick={runWorkflow} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Play size={16} />
            运行工作流
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Node Library Panel */}
        {isNodeLibraryOpen && (
          <div className="w-64 bg-[#171717] border-r border-[#262626] overflow-y-auto p-4">
            <div className="mb-4">
              <div className="flex items-center gap-2 bg-[#262626] rounded-md p-2 mb-4">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索节点..." 
                  className="bg-transparent border-none outline-none text-white text-sm flex-1"
                />
              </div>
              
              <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4">
                <Filter size={16} />
                筛选节点
              </button>
            </div>
            
            <div className="space-y-4">
              {nodeCategories.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-gray-300">
                    <span>{category.name}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                  <div className="space-y-2 pl-2">
                    {category.nodes.map((nodeDef, nodeIndex) => (
                      <div 
                        key={nodeIndex}
                        className="p-3 bg-[#262626] hover:bg-[#333] rounded-md cursor-pointer transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('nodeType', nodeDef.type);
                        }}
                        onClick={() => {
                          // Add node at default position when clicked
                          addNode(nodeDef.type as any, { x: 200, y: 200 });
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{nodeDef.icon}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{nodeDef.label}</div>
                            <div className="text-xs text-gray-400 line-clamp-1">{nodeDef.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className={`flex-1 bg-[#0f0f0f] relative overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseMove={(e) => {
            handleCanvasMouseMove(e);
            handlePanMove(e);
            // Update connection preview if connecting
            if (isConnecting) {
              e.preventDefault();
            }
          }}
          onMouseUp={(e) => {
            handleNodeDragEnd();
            handleCanvasMouseUp();
            handlePanEnd();
          }}
          onMouseLeave={(e) => {
            handleNodeDragEnd();
            handleCanvasMouseUp();
            handlePanEnd();
          }}
          onWheel={handleZoom}
          onMouseDown={handlePanStart}
        >
          {/* Canvas Grid Background - Infinite */}
          <div 
            className="absolute inset-0 canvas-background"
            style={{
              transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
              backgroundImage: `linear-gradient(to right, rgba(25, 25, 25, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(25, 25, 25, 0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              backgroundPosition: `${canvasPosition.x % 40}px ${canvasPosition.y % 40}px`,
              width: '10000px',
              height: '10000px',
              left: '-5000px',
              top: '-5000px'
            }}
          />
          
          {/* Render Edges */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ 
              transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
              transformOrigin: 'top left'
            }}
          >
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              // 计算节点中心位置，考虑画布变换
              const sourceX = sourceNode.position.x + 100; // 节点宽度的一半
              const sourceY = sourceNode.position.y + 80; // 节点高度的一半
              const targetX = targetNode.position.x + 100; // 节点宽度的一半
              const targetY = targetNode.position.y + 80; // 节点高度的一半
              
              return (
                <g 
                  key={edge.id}
                  style={{
                    // 对边应用与节点相同的变换，确保它们始终连接
                    transform: `translate(${-canvasPosition.x}px, ${-canvasPosition.y}px) scale(${1/zoom})`,
                    transformOrigin: 'top left'
                  }}
                >
                  <path
                    d={`M${sourceX} ${sourceY} C${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`}
                    stroke={`${workflowStatus === 'running' ? '#facc15' : edge.data?.type === 'error' ? '#ef4444' : '#60a5fa'}`}
                    strokeWidth={2 / zoom} // 调整线条宽度，使其在缩放时保持一致
                    strokeDasharray={workflowStatus === 'running' ? '5,5' : 'none'}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-300"
                    style={{
                      animation: workflowStatus === 'running' ? 'dash 1s linear infinite' : 'none'
                    }}
                  />
                  <polygon
                    points={`${targetX} ${targetY}, ${targetX - 8} ${targetY - 5}, ${targetX - 8} ${targetY + 5}`}
                    fill={`${workflowStatus === 'running' ? '#facc15' : edge.data?.type === 'error' ? '#ef4444' : '#60a5fa'}`}
                    transform={`scale(${1/zoom})`} // 箭头大小保持一致
                    transformOrigin={`${targetX} ${targetY}`}
                  />
                </g>
              );
            })}
            
            {/* Connection Preview */}
            {isConnecting && connectionStart && (
              <g
                style={{
                  // 对连接预览应用与节点相同的变换
                  transform: `translate(${-canvasPosition.x}px, ${-canvasPosition.y}px) scale(${1/zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                <path
                  d={`M${connectionStart.position.x} ${connectionStart.position.y} C${connectionStart.position.x + 50} ${connectionStart.position.y}, ${connectionStart.previewPosition ? connectionStart.previewPosition.x - 50 : connectionStart.position.x + 150} ${connectionStart.previewPosition ? connectionStart.previewPosition.y : connectionStart.position.y}, ${connectionStart.previewPosition ? connectionStart.previewPosition.x : connectionStart.position.x + 200} ${connectionStart.previewPosition ? connectionStart.previewPosition.y : connectionStart.position.y}`}
                  stroke="#facc15"
                  strokeWidth={2 / zoom} // 调整线条宽度，使其在缩放时保持一致
                  strokeDasharray="5,5"
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-50"
                />
                <polygon
                  points={`${connectionStart.previewPosition ? connectionStart.previewPosition.x : connectionStart.position.x + 200} ${connectionStart.previewPosition ? connectionStart.previewPosition.y : connectionStart.position.y}, ${connectionStart.previewPosition ? connectionStart.previewPosition.x - 8 : connectionStart.position.x + 192} ${connectionStart.previewPosition ? connectionStart.previewPosition.y - 5 : connectionStart.position.y - 5}, ${connectionStart.previewPosition ? connectionStart.previewPosition.x - 8 : connectionStart.position.x + 192} ${connectionStart.previewPosition ? connectionStart.previewPosition.y + 5 : connectionStart.position.y + 5}`}
                  fill="#facc15"
                  transform={`scale(${1/zoom})`} // 箭头大小保持一致
                  transformOrigin={`${connectionStart.previewPosition ? connectionStart.previewPosition.x : connectionStart.position.x + 200} ${connectionStart.previewPosition ? connectionStart.previewPosition.y : connectionStart.position.y}`}
                />
              </g>
            )}
          </svg>
          
          {/* Render Nodes */}
          {nodes.map(node => (
            <div 
              key={node.id}
              className={`absolute rounded-xl shadow-lg transition-all duration-300 z-10 ${selectedNode?.id === node.id ? 'ring-2 ring-blue-500' : ''} ${isConnecting ? 'cursor-crosshair' : 'cursor-move'}`}
              style={{
                left: node.position.x,
                top: node.position.y,
                transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                minWidth: '200px',
                maxWidth: '300px'
              }}
              onClick={() => handleNodeClick(node)}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.node-header')) {
                  handleNodeDragStart(node.id, e.clientX, e.clientY);
                }
              }}
              onMouseUp={(e) => {
                handleNodeDragEnd();
                // 如果正在连接，尝试连接到当前节点
                if (isConnecting) {
                  handleConnectionEnd(node.id);
                }
              }}
              onMouseEnter={() => {
                if (isConnecting) {
                  handleNodeMouseEnterDuringConnection(node.id);
                }
              }}
              onMouseLeave={() => {
                if (isConnecting) {
                  handleNodeMouseLeaveDuringConnection();
                }
              }}
            >
              {/* Node Header */}
              <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-4 ${getHeaderColor(node.type)} bg-[#171717] cursor-move node-header`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getNodeIcon(node.type)}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{node.data.label}</div>
                    <div className="text-xs text-gray-300">{node.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${node.data.status === 'running' ? 'bg-yellow-500 animate-pulse' : node.data.status === 'success' ? 'bg-green-500' : node.data.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}
                  />
                  <button 
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#262626] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {/* Node Content */}
              <div className="bg-[#1a1a1a] border-x border-[#262626]">
                {/* Input Area */}
                <div className="p-3 border-b border-[#262626]">
                  <div className="text-xs text-gray-400 mb-2 font-semibold">输入</div>
                  <div className="bg-[#111] p-2 rounded-md text-xs text-gray-300 min-h-[40px]">
                    {node.type === 'input' ? (
                      <textarea 
                        value={node.data.parameters?.value || ''} 
                        onChange={(e) => {
                          updateNodeParameters(node.id, { value: e.target.value });
                        }}
                        className="w-full bg-transparent border-none outline-none text-white text-xs resize-none"
                        placeholder="输入指令..."
                        rows={2}
                      />
                    ) : (
                      <div className="text-gray-500 italic">从上游节点获取数据</div>
                    )}
                  </div>
                </div>
                
                {/* Processing Status */}
                {node.data.status === 'running' && (
                  <div className="p-2 bg-[#222] border-y border-[#262626] text-xs text-gray-300 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                )}
                
                {/* Output Area */}
                <div className="p-3 border-b border-[#262626]">
                  <div className="text-xs text-gray-400 mb-2 font-semibold">输出</div>
                  <div className="bg-[#111] p-2 rounded-md text-xs min-h-[60px]">
                    {node.data.output ? (
                      <div className="text-gray-300">
                        {typeof node.data.output === 'object' ? (
                          JSON.stringify(node.data.output, null, 2)
                        ) : (
                          <span>{node.data.output}</span>
                        )}
                      </div>
                    ) : node.data.status === 'error' ? (
                      <div className="text-red-400">错误: {node.data.description || '处理失败'}</div>
                    ) : (
                      <div className="text-gray-500 italic">等待运行...</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Node Footer */}
              <div className="flex justify-between p-2 bg-[#171717] rounded-b-xl border-b border-[#262626]">
                {/* Input Handle */}
                <div 
                  className={`w-4 h-4 rounded-full ${isConnecting ? 'bg-green-500 hover:bg-green-600' : 'bg-[#60a5fa] hover:bg-[#3b82f6]'} cursor-pointer transition-colors`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (isConnecting) {
                      // End connection to this node
                      handleConnectionEnd(node.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isConnecting) {
                      // Preview connection to this node
                    }
                  }}
                />
                
                {/* Node Type Badge */}
                <div className={`text-xs px-2 py-0.5 rounded-full ${getHeaderColor(node.type)}`}>
                  {node.type === 'gemini' ? 'Gemini' : 
                   node.type === 'nanobanana_image' ? 'Nanobanana' : 
                   node.type === 'veo_video' ? 'VEO' : 
                   node.type === 'keling_o1_edit' ? 'Keling-O1' : 
                   node.type === 'input' ? 'Input' : 
                   node.type === 'output' ? 'Output' : 
                   'AI'}
                </div>
                
                {/* Output Handle */}
                <div 
                  className={`w-4 h-4 rounded-full ${isConnecting ? 'bg-green-500 hover:bg-green-600' : 'bg-[#60a5fa] hover:bg-[#3b82f6]'} cursor-pointer transition-colors`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    // Start connection from this node
                    handleConnectionStart(node.id, e.clientX, e.clientY);
                  }}
                />
              </div>
            </div>
          ))}
          
          {/* Drop zone for new nodes */}
          <div 
            className="absolute inset-0" 
            onDrop={(e) => {
              e.preventDefault();
              const nodeType = e.dataTransfer.getData('nodeType') as WorkflowNode['type'];
              if (nodeType && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / zoom;
                const y = (e.clientY - rect.top) / zoom;
                addNode(nodeType, { x, y });
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          />
        </div>
        
        {/* Sidebar for Node Configuration */}
        {isSidebarOpen && selectedNode && (
          <div className="w-80 bg-[#171717] border-l border-[#262626] overflow-y-auto">
            <div className="p-4 border-b border-[#262626]">
              <h3 className="text-lg font-bold text-white">节点配置</h3>
              <p className="text-sm text-gray-400 mt-1">{selectedNode.data.label}</p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Node Parameters */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.label} 
                    onChange={(e) => {
                      setNodes(nodes.map(node => 
                        node.id === selectedNode.id 
                          ? { ...node, data: { ...node.data, label: e.target.value } } 
                          : node
                      ));
                      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, label: e.target.value } } : null);
                    }}
                    className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">描述</label>
                  <textarea 
                    value={selectedNode.data.description || ''} 
                    onChange={(e) => {
                      setNodes(nodes.map(node => 
                        node.id === selectedNode.id 
                          ? { ...node, data: { ...node.data, description: e.target.value } } 
                          : node
                      ));
                      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, description: e.target.value } } : null);
                    }}
                    className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="节点描述..."
                  />
                </div>
                
                {/* Dynamic parameters based on node type */}
                {selectedNode.type === 'gemini' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">模型</label>
                      <select 
                        value={selectedNode.data.parameters?.model || 'gemini-3-pro'} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { model: e.target.value });
                        }}
                        className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="gemini-3-pro">Gemini 3 Pro</option>
                        <option value="gemini-3-flash">Gemini 3 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">温度</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        value={selectedNode.data.parameters?.temperature || 0.7} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { temperature: parseFloat(e.target.value) });
                        }}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-400 mt-1">{selectedNode.data.parameters?.temperature || 0.7}</div>
                    </div>
                  </div>
                )}
                
                {selectedNode.type === 'nanobanana_image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">模型</label>
                      <select 
                        value={selectedNode.data.parameters?.model || 'nano-banana-pro'} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { model: e.target.value });
                        }}
                        className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="nano-banana-pro">Nano Banana Pro</option>
                        <option value="nano-banana-lite">Nano Banana Lite</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">宽高比</label>
                      <select 
                        value={selectedNode.data.parameters?.aspectRatio || '16:9'} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { aspectRatio: e.target.value });
                        }}
                        className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="1:1">1:1</option>
                        <option value="4:3">4:3</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {selectedNode.type === 'veo_video' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">模型</label>
                      <select 
                        value={selectedNode.data.parameters?.model || 'veo3.1-fast'} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { model: e.target.value });
                        }}
                        className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="veo3.1-fast">VEO 3.1 Fast</option>
                        <option value="veo3.1-pro">VEO 3.1 Pro</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">时长 (秒)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="60"
                        value={selectedNode.data.parameters?.duration || 10} 
                        onChange={(e) => {
                          updateNodeParameters(selectedNode.id, { duration: parseInt(e.target.value) });
                        }}
                        className="w-full p-2 bg-[#262626] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Node Output Preview */}
              {selectedNode.data.output && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                    <span>输出详情</span>
                    <RefreshCw size={16} className="text-gray-400 hover:text-white cursor-pointer" />
                  </div>
                  <div className="p-3 bg-[#262626] rounded-md text-xs text-gray-300 max-h-[200px] overflow-y-auto">
                    {JSON.stringify(selectedNode.data.output, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
const getHeaderColor = (type: WorkflowNode['type']): string => {
  const colors: Record<WorkflowNode['type'], string> = {
    input: 'bg-blue-600',
    output: 'bg-green-600',
    gemini: 'bg-purple-600',
    chat: 'bg-indigo-600',
    nanobanana_image: 'bg-pink-600',
    nanobanana_edit: 'bg-rose-600',
    veo_video: 'bg-orange-600',
    keling_o1_edit: 'bg-amber-600'
  };
  return colors[type] || 'bg-gray-600';
};

const getNodeIcon = (type: WorkflowNode['type']): string => {
  const icons: Record<WorkflowNode['type'], string> = {
    input: '📥',
    output: '📤',
    gemini: '🤖',
    chat: '💬',
    nanobanana_image: '🖼️',
    nanobanana_edit: '✏️',
    veo_video: '🎬',
    keling_o1_edit: '🎞️'
  };
  return icons[type] || '📦';
};

const updateNodeParameters = (nodeId: string, updates: Record<string, any>) => {
  // This function would be implemented to update node parameters
  console.log('Update node parameters:', nodeId, updates);
};

const saveWorkflow = () => {
  // This function would be implemented to save the workflow
  console.log('Save workflow');
};

export default VibeAgentWorkflowView;
