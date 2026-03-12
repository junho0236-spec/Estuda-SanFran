
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Undo, Redo, Save, Download, X, Maximize2, Minimize2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  type: 'pen' | 'eraser';
}

interface HandwritingCanvasProps {
  initialData?: string; // JSON string of strokes
  onSave: (data: string) => void;
  onExportImage: (base64: string) => void;
  onClose: () => void;
}

const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({ initialData, onSave, onExportImage, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (Array.isArray(parsed)) {
          setStrokes(parsed);
        }
      } catch (e) {
        console.error("Error parsing handwriting data:", e);
      }
    }
  }, [initialData]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.type === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (optional, but good for visibility)
    // ctx.fillStyle = '#ffffff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => drawStroke(ctx, stroke));
  }, [strokes, drawStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCoordinates(e);
    const newStroke: Stroke = {
      points: [point],
      color: color,
      width: tool === 'eraser' ? width * 5 : width,
      type: tool
    };
    setStrokes(prev => [...prev, newStroke]);
    setRedoStack([]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCoordinates(e);
    
    setStrokes(prev => {
      const lastStroke = prev[prev.length - 1];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, point]
      };
      return [...prev.slice(0, -1), updatedStroke];
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack(prev => [...prev, last]);
    setStrokes(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setStrokes(prev => [...prev, last]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const clear = () => {
    if (window.confirm("Limpar toda a tela?")) {
      setStrokes([]);
      setRedoStack([]);
    }
  };

  const handleSave = () => {
    onSave(JSON.stringify(strokes));
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary canvas with white background for export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw existing strokes
    strokes.forEach(stroke => drawStroke(tempCtx, stroke));

    const base64 = tempCanvas.toDataURL('image/png');
    onExportImage(base64);
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const parent = canvas.parentElement;
      if (!parent) return;

      // Save current content
      const tempStrokes = [...strokes];
      
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      // Redraw
      setStrokes(tempStrokes);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [strokes]);

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-[100]' : 'relative h-[500px]'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="flex bg-white dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
            <button 
              onClick={() => setTool('pen')}
              className={`p-2 rounded-md transition-all ${tool === 'pen' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Caneta"
            >
              <Pencil size={20} />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-md transition-all ${tool === 'eraser' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Borracha"
            >
              <Eraser size={20} />
            </button>
          </div>

          {tool === 'pen' && (
            <div className="flex items-center gap-2">
              {['#000000', '#9B111E', '#1094ab', '#1a1a1a', '#8b5cf6'].map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'scale-125 border-slate-400' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Espessura</span>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={width} 
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-24 accent-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={strokes.length === 0} className="p-2 text-slate-400 hover:text-purple-500 disabled:opacity-30">
            <Undo size={20} />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="p-2 text-slate-400 hover:text-purple-500 disabled:opacity-30">
            <Redo size={20} />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button onClick={clear} className="p-2 text-slate-400 hover:text-red-500">
            <Trash2 size={20} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-slate-400 hover:text-blue-500">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md"
          >
            <Save size={16} /> Salvar Traços
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
          >
            <Download size={16} /> Inserir na Nota
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white cursor-crosshair overflow-hidden">
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full touch-none"
        />
        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <p className="text-2xl font-black uppercase tracking-[0.5em] text-slate-300">Área de Escrita</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandwritingCanvas;
