
import React, { useState, useEffect, useRef } from 'react';
import { ScanSearch, User, FileText, Fingerprint, Plus, Trash2, Save, Move, MousePointer2, AlertCircle, GripHorizontal, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { BoardNode, BoardEdge, NodeType, InvestigationBoardData } from '../types';

interface InvestigationBoardProps {
  userId: string;
}

const InvestigationBoard: React.FC<InvestigationBoardProps> = ({ userId }) => {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [title, setTitle] = useState("Novo Caso");
  const [isLoading, setIsLoading] = useState(true);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [connectingNode, setConnectingNode] = useState<string | null>(null);
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Load Board
  useEffect(() => {
    loadBoard();
  }, [userId]);

  const loadBoard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('investigation_boards')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setBoardId(data.id);
        setTitle(data.title);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } else {
        // Create initial empty board if none exists
        createNewBoard();
      }
    } catch (e) {
      // If error is no rows, create new
      createNewBoard();
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBoard = async () => {
    const newId = crypto.randomUUID();
    setBoardId(newId);
    setNodes([]);
    setEdges([]);
    setTitle("Novo Caso");
  };

  const saveBoard = async () => {
    if (!boardId) return;
    try {
      const payload = {
        id: boardId,
        user_id: userId,
        title,
        nodes,
        edges,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('investigation_boards')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      alert("Lousa salva com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    }
  };

  // --- NODE LOGIC ---

  const addNode = (type: NodeType) => {
    // Center of current view
    const centerX = -viewOffset.x + (containerRef.current?.clientWidth || 800) / 2 - 100;
    const centerY = -viewOffset.y + (containerRef.current?.clientHeight || 600) / 2 - 50;
    
    // Random jitter
    const x = centerX + (Math.random() * 40 - 20);
    const y = centerY + (Math.random() * 40 - 20);

    const newNode: BoardNode = {
      id: crypto.randomUUID(),
      type,
      x,
      y,
      label: type === 'person' ? 'Suspeito' : type === 'evidence' ? 'Prova' : type === 'place' ? 'Local' : 'Nota',
      details: ''
    };

    setNodes([...nodes, newNode]);
  };

  const updateNode = (id: string, updates: Partial<BoardNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id: string) => {
    if (!confirm("Remover este item?")) return;
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
  };

  // --- DRAG LOGIC ---

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (mode === 'connect') {
      if (connectingNode === null) {
        setConnectingNode(id);
      } else {
        if (connectingNode !== id) {
          // Create Edge
          const newEdge: BoardEdge = {
            id: crypto.randomUUID(),
            from: connectingNode,
            to: id
          };
          // Check duplicates
          if (!edges.some(edge => (edge.from === newEdge.from && edge.to === newEdge.to) || (edge.from === newEdge.to && edge.to === newEdge.from))) {
             setEdges([...edges, newEdge]);
          }
        }
        setConnectingNode(null);
      }
    } else {
      setDraggedNode(id);
    }
  };

  const handleMouseDownBg = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'board-bg') {
        setIsDraggingView(true);
        setStartDragPos({ x: e.clientX, y: e.clientY });
        setConnectingNode(null); // Cancel connection
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingView) {
      const dx = e.clientX - startDragPos.x;
      const dy = e.clientY - startDragPos.y;
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartDragPos({ x: e.clientX, y: e.clientY });
    } else if (draggedNode) {
      const zoom = 1; // Assuming zoom 1 for simplicity in MVP
      const nodeIndex = nodes.findIndex(n => n.id === draggedNode);
      if (nodeIndex === -1) return;
      
      const updatedNodes = [...nodes];
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        x: updatedNodes[nodeIndex].x + e.movementX / zoom,
        y: updatedNodes[nodeIndex].y + e.movementY / zoom
      };
      setNodes(updatedNodes);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingView(false);
    setDraggedNode(null);
  };

  // --- SVG LINES ---
  const getNodeCenter = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    // Node dimensions approximation
    const width = node.type === 'note' ? 160 : 200;
    const height = node.type === 'note' ? 160 : 80;
    return { x: node.x + width / 2, y: node.y + height / 2 };
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-amber-100 dark:bg-amber-900/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <ScanSearch className="w-6 h-6 text-amber-700 dark:text-amber-500" />
           </div>
           <div>
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-black bg-transparent outline-none text-slate-900 dark:text-white uppercase tracking-tight w-full md:w-auto"
              />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mapa Mental de Casos</p>
           </div>
        </div>

        <div className="flex gap-2">
           <div className="bg-slate-100 dark:bg-white/10 p-1 rounded-xl flex">
              <button 
                onClick={() => setMode('move')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${mode === 'move' ? 'bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <Move size={14} /> Mover
              </button>
              <button 
                onClick={() => setMode('connect')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${mode === 'connect' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <GripHorizontal size={14} /> Conectar
              </button>
           </div>
           
           <button onClick={saveBoard} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Save size={14} /> Salvar
           </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4 shrink-0">
         <button onClick={() => addNode('person')} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-amber-500 transition-all shadow-sm">
            <User size={16} className="text-amber-600" /> <span className="text-xs font-bold">Pessoa</span>
         </button>
         <button onClick={() => addNode('evidence')} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-red-500 transition-all shadow-sm">
            <Fingerprint size={16} className="text-red-600" /> <span className="text-xs font-bold">Prova</span>
         </button>
         <button onClick={() => addNode('place')} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-blue-500 transition-all shadow-sm">
            <AlertCircle size={16} className="text-blue-600" /> <span className="text-xs font-bold">Local/Fato</span>
         </button>
         <button onClick={() => addNode('note')} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-yellow-400 transition-all shadow-sm">
            <FileText size={16} className="text-yellow-500" /> <span className="text-xs font-bold">Nota</span>
         </button>
      </div>

      {/* CANVAS AREA */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#e8e4dc] dark:bg-[#1a1a1a] rounded-[2rem] border-8 border-[#d4c5a9] dark:border-[#2d2d2d] shadow-inner relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDownBg}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
         {/* Background Texture (Corkboard or Grid) */}
         <div 
            id="board-bg"
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
               backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
               backgroundSize: '20px 20px',
               transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`
            }} 
         />

         {/* CONTENT LAYER */}
         <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)` }}
         >
            {/* SVG Lines */}
            <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
               {edges.map(edge => {
                  const start = getNodeCenter(edge.from);
                  const end = getNodeCenter(edge.to);
                  return (
                     <line 
                        key={edge.id}
                        x1={start.x + 5000} y1={start.y + 5000}
                        x2={end.x + 5000} y2={end.y + 5000}
                        stroke="#ef4444" 
                        strokeWidth="2"
                        strokeDasharray="5,5" // Corda tracejada
                        className="drop-shadow-sm opacity-80"
                     />
                  )
               })}
               {/* Line for connecting mode */}
               {mode === 'connect' && connectingNode && (
                  <line 
                     x1={getNodeCenter(connectingNode).x + 5000} 
                     y1={getNodeCenter(connectingNode).y + 5000} 
                     // We don't have mouse pos here easily without state, skipping visual drag line for simplicity, 
                     // users click A then B.
                     x2={getNodeCenter(connectingNode).x + 5000} y2={getNodeCenter(connectingNode).y + 5000}
                     stroke="transparent"
                  />
               )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
               <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                  className={`absolute pointer-events-auto transition-shadow ${connectingNode === node.id ? 'ring-4 ring-red-500 shadow-2xl' : 'hover:shadow-xl'}`}
               >
                  {node.type === 'note' ? (
                     // Post-it Style
                     <div className="w-40 h-40 bg-yellow-200 dark:bg-yellow-600 shadow-lg p-4 rotate-1 text-slate-900 dark:text-white flex flex-col font-handwriting">
                        <textarea 
                           value={node.label}
                           onChange={(e) => updateNode(node.id, { label: e.target.value })}
                           className="bg-transparent border-none w-full h-full resize-none outline-none text-sm font-bold placeholder:text-yellow-700/50"
                           placeholder="Anotação..."
                        />
                        <button onClick={() => deleteNode(node.id)} className="absolute top-1 right-1 opacity-0 hover:opacity-100 text-red-600"><X size={12} /></button>
                     </div>
                  ) : (
                     // Card Style
                     <div className="w-52 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 flex items-start gap-3 relative group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                           node.type === 'person' ? 'bg-amber-100 text-amber-600' : 
                           node.type === 'evidence' ? 'bg-red-100 text-red-600' : 
                           'bg-blue-100 text-blue-600'
                        }`}>
                           {node.type === 'person' ? <User size={20} /> : node.type === 'evidence' ? <Fingerprint size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <input 
                              value={node.label}
                              onChange={(e) => updateNode(node.id, { label: e.target.value })}
                              className="w-full bg-transparent font-black text-xs uppercase outline-none text-slate-900 dark:text-white mb-1"
                              placeholder="Título..."
                           />
                           <input 
                              value={node.details || ''}
                              onChange={(e) => updateNode(node.id, { details: e.target.value })}
                              className="w-full bg-transparent text-[10px] text-slate-500 outline-none"
                              placeholder="Detalhes..."
                           />
                        </div>
                        {/* Pin Visual */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-600 border border-red-800 shadow-sm z-20"></div>
                        
                        <button 
                           onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                           className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Trash2 size={10} />
                        </button>
                     </div>
                  )}
               </div>
            ))}
         </div>
         
         {/* Instruction Overlay */}
         {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
               <div className="text-center">
                  <ScanSearch size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-xl font-black uppercase text-slate-500">Quadro Vazio</p>
                  <p className="text-sm font-bold text-slate-400">Adicione suspeitos e provas para começar a investigação.</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default InvestigationBoard;
