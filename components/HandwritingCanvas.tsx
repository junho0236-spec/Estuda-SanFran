
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
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;
    }
  }, []);

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
    if (stroke.points.length === 0) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.type === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (stroke.points.length === 1) {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
    } else {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // Reset
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => drawStroke(ctx, stroke));
  }, [strokes, drawStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getCoordinates = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Use direct event listeners for better touch support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleStart = (e: MouseEvent | TouchEvent) => {
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

      // Draw initial point
      const ctx = contextRef.current;
      if (ctx) {
        drawStroke(ctx, newStroke);
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getCoordinates(e);
      
      setStrokes(prev => {
        if (prev.length === 0) return prev;
        const lastStroke = prev[prev.length - 1];
        const updatedStroke = {
          ...lastStroke,
          points: [...lastStroke.points, point]
        };
        
        // Immediate draw for performance
        const ctx = contextRef.current;
        if (ctx) {
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = updatedStroke.type === 'eraser' ? '#ffffff' : updatedStroke.color;
          ctx.lineWidth = updatedStroke.width;
          if (updatedStroke.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
          
          const prevPoint = lastStroke.points[lastStroke.points.length - 1];
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }

        return [...prev.slice(0, -1), updatedStroke];
      });
    };

    const handleEnd = () => {
      setIsDrawing(false);
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [isDrawing, color, width, tool, drawStroke]);

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
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    strokes.forEach(stroke => drawStroke(tempCtx, stroke));

    const base64 = tempCanvas.toDataURL('image/png');
    onExportImage(base64);
  };

  // Resize handler with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          redraw();
        }
      }
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [redraw]);

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
