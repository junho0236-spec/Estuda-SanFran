
import React, { useMemo, useState } from 'react';
import { Subject, StudySession } from '../types';
import { Network, Gavel, Scale, Briefcase, Landmark, Shield, Lock, Star, ChevronRight, GraduationCap } from 'lucide-react';

interface SpecializationTreeProps {
  subjects: Subject[];
  studySessions: StudySession[];
}

interface SkillNode {
  id: string;
  title: string;
  description: string;
  hoursRequired: number;
  level: number;
  icon: React.ElementType;
}

interface Branch {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ElementType;
  keywords: string[]; // Para match com o nome das matérias
  nodes: SkillNode[];
}

// Configuração da Árvore
const BRANCHES: Branch[] = [
  {
    id: 'criminal',
    name: 'Ciências Criminais',
    description: 'A defesa da liberdade e a acusação justa.',
    color: '#9B111E', // SanFran Rubi
    icon: Shield,
    keywords: ['penal', 'criminal', 'crim', 'processo penal', 'inquérito'],
    nodes: [
      { id: 'c1', title: 'Estagiário de Delegacia', description: 'O primeiro contato com o inquérito.', hoursRequired: 5, level: 1, icon: Shield },
      { id: 'c2', title: 'Advogado Criminalista Jr.', description: 'Primeiros HCs impetrados.', hoursRequired: 20, level: 2, icon: Briefcase },
      { id: 'c3', title: 'Tribuno do Júri', description: 'O poder da oratória no plenário.', hoursRequired: 50, level: 3, icon: Gavel },
      { id: 'c4', title: 'Lenda do Tribunal', description: 'Referência absoluta em defesa.', hoursRequired: 100, level: 4, icon: Star },
    ]
  },
  {
    id: 'civil',
    name: 'Direito Privado',
    description: 'As relações entre particulares e bens.',
    color: '#1094ab', // USP Blue
    icon: Scale,
    keywords: ['civil', 'família', 'consumidor', 'contratos', 'sucessões', 'processo civil', 'cpc'],
    nodes: [
      { id: 'v1', title: 'Estagiário de Cartório', description: 'Aprendendo a mover a máquina.', hoursRequired: 5, level: 1, icon: Scale },
      { id: 'v2', title: 'Processualista', description: 'Mestre dos prazos e recursos.', hoursRequired: 20, level: 2, icon: Briefcase },
      { id: 'v3', title: 'Juiz de Direito', description: 'A imparcialidade personificada.', hoursRequired: 50, level: 3, icon: Gavel },
      { id: 'v4', title: 'Desembargador', description: 'A última palavra na corte.', hoursRequired: 100, level: 4, icon: Landmark },
    ]
  },
  {
    id: 'public',
    name: 'Direito Público',
    description: 'A estrutura do Estado e a Constituição.',
    color: '#fcb421', // USP Gold
    icon: Landmark,
    keywords: ['const', 'adm', 'tribut', 'public', 'estado', 'eleitoral'],
    nodes: [
      { id: 'p1', title: 'Pesquisador Constitucional', description: 'Entendendo a Carta Magna.', hoursRequired: 5, level: 1, icon: Landmark },
      { id: 'p2', title: 'Procurador do Estado', description: 'Defendendo o interesse público.', hoursRequired: 20, level: 2, icon: Briefcase },
      { id: 'p3', title: 'Constitucionalista', description: 'O guardião das garantias.', hoursRequired: 50, level: 3, icon: Scale },
      { id: 'p4', title: 'Ministro da Corte', description: 'Interpretando a vontade da nação.', hoursRequired: 100, level: 4, icon: Gavel },
    ]
  },
  {
    id: 'corporate',
    name: 'Direito Corporativo',
    description: 'O mundo dos negócios e do trabalho.',
    color: '#10b981', // Emerald
    icon: Briefcase,
    keywords: ['emp', 'trab', 'econ', 'comercial', 'societário'],
    nodes: [
      { id: 'e1', title: 'Trainee Jurídico', description: 'Compliance e contratos.', hoursRequired: 5, level: 1, icon: Briefcase },
      { id: 'e2', title: 'Consultor Trabalhista', description: 'Harmonizando capital e trabalho.', hoursRequired: 20, level: 2, icon: Scale },
      { id: 'e3', title: 'Sócio de Banca', description: 'Liderando grandes fusões.', hoursRequired: 50, level: 3, icon: Network },
      { id: 'e4', title: 'Magnata do Direito', description: 'Autoridade em Law & Economics.', hoursRequired: 100, level: 4, icon: Star },
    ]
  }
];

const SpecializationTree: React.FC<SpecializationTreeProps> = ({ subjects, studySessions }) => {
  const [selectedNode, setSelectedNode] = useState<{node: SkillNode, branch: Branch, unlocked: boolean} | null>(null);

  // Calcula horas por Ramo
  const progressData = useMemo(() => {
    const hoursByBranch: Record<string, number> = {
      criminal: 0,
      civil: 0,
      public: 0,
      corporate: 0
    };

    // Mapeia Subject ID -> Branch ID
    const subjectMapping: Record<string, string> = {};
    subjects.forEach(sub => {
      const nameLower = sub.name.toLowerCase();
      let found = false;
      for (const branch of BRANCHES) {
        if (branch.keywords.some(k => nameLower.includes(k))) {
          subjectMapping[sub.id] = branch.id;
          found = true;
          break;
        }
      }
      if (!found) subjectMapping[sub.id] = 'civil'; // Default fallback
    });

    // Soma as horas
    studySessions.forEach(session => {
      if (session.subject_id && subjectMapping[session.subject_id]) {
        const branchId = subjectMapping[session.subject_id];
        hoursByBranch[branchId] += (Number(session.duration) || 0) / 3600;
      }
    });

    return hoursByBranch;
  }, [subjects, studySessions]);

  // Renderiza o SVG
  const renderTree = () => {
    // Configurações geométricas
    const centerX = 400;
    const centerY = 400;
    const branchLength = 280;
    
    // Coordenadas para cada ramo (radial)
    // 0: Top-Left, 1: Top-Right, 2: Bottom-Right, 3: Bottom-Left
    const angles = [225, 315, 45, 135]; 

    return (
      <svg viewBox="0 0 800 800" className="w-full h-full max-w-2xl mx-auto drop-shadow-2xl">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Círculo Central (Início) */}
        <circle cx={centerX} cy={centerY} r="40" fill="#1e293b" stroke="#334155" strokeWidth="4" />
        <foreignObject x={centerX - 20} y={centerY - 20} width="40" height="40">
           <div className="flex items-center justify-center h-full w-full text-slate-400">
              <GraduationCap size={24} />
           </div>
        </foreignObject>

        {BRANCHES.map((branch, branchIndex) => {
          const angleRad = (angles[branchIndex] * Math.PI) / 180;
          const currentHours = progressData[branch.id];
          
          return (
            <g key={branch.id}>
              {/* Linha Principal do Ramo */}
              <line 
                x1={centerX} 
                y1={centerY} 
                x2={centerX + Math.cos(angleRad) * branchLength} 
                y2={centerY + Math.sin(angleRad) * branchLength} 
                stroke={branch.color} 
                strokeWidth="6"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />

              {/* Nós */}
              {branch.nodes.map((node, nodeIndex) => {
                const distance = 70 + (nodeIndex * 70); // Distância do centro
                const nodeX = centerX + Math.cos(angleRad) * distance;
                const nodeY = centerY + Math.sin(angleRad) * distance;
                const unlocked = currentHours >= node.hoursRequired;
                const nextUnlocked = nodeIndex < branch.nodes.length - 1 && currentHours >= branch.nodes[nodeIndex+1].hoursRequired;
                
                // Linha "preenchida" até este nó
                if (unlocked) {
                   const prevDistance = nodeIndex === 0 ? 0 : 70 + ((nodeIndex - 1) * 70);
                   const startX = nodeIndex === 0 ? centerX : centerX + Math.cos(angleRad) * prevDistance;
                   const startY = nodeIndex === 0 ? centerY : centerY + Math.sin(angleRad) * prevDistance;
                   
                   return (
                     <React.Fragment key={node.id}>
                        <line 
                          x1={startX} y1={startY} x2={nodeX} y2={nodeY}
                          stroke={branch.color} strokeWidth="6" strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <circle 
                          cx={nodeX} cy={nodeY} r={unlocked ? 24 : 18} 
                          fill={unlocked ? branch.color : '#1e293b'} 
                          stroke={unlocked ? '#fff' : '#475569'}
                          strokeWidth={unlocked ? 3 : 2}
                          className={`cursor-pointer transition-all duration-500 ${unlocked ? 'hover:r-28' : ''}`}
                          filter={unlocked ? 'url(#glow)' : ''}
                          onClick={() => setSelectedNode({ node, branch, unlocked })}
                        />
                        <foreignObject x={nodeX - 12} y={nodeY - 12} width="24" height="24" style={{pointerEvents: 'none'}}>
                           <div className={`flex items-center justify-center h-full w-full ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                              {unlocked ? <node.icon size={14} /> : <Lock size={12} />}
                           </div>
                        </foreignObject>
                     </React.Fragment>
                   );
                } else {
                   // Nó bloqueado
                   return (
                     <React.Fragment key={node.id}>
                        <circle 
                          cx={nodeX} cy={nodeY} r="16" 
                          fill="#0f172a" 
                          stroke="#334155"
                          strokeWidth="2"
                          className="cursor-pointer hover:stroke-slate-400 transition-all"
                          onClick={() => setSelectedNode({ node, branch, unlocked })}
                        />
                        <foreignObject x={nodeX - 10} y={nodeY - 10} width="20" height="20" style={{pointerEvents: 'none'}}>
                           <div className="flex items-center justify-center h-full w-full text-slate-700">
                              <Lock size={12} />
                           </div>
                        </foreignObject>
                     </React.Fragment>
                   );
                }
              })}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 mb-4">
              <Network className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Mapa de Carreira</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Árvore de Especialização</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Sua evolução técnica visualizada.</p>
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-[#050505] rounded-[3rem] border-4 border-slate-200 dark:border-sanfran-rubi/10 shadow-inner">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 pointer-events-none"></div>
         {renderTree()}

         {/* Painel de Detalhes (Overlay) */}
         {selectedNode && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl border-2 border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-10">
               <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${selectedNode.unlocked ? '' : 'grayscale opacity-50'}`} style={{ backgroundColor: selectedNode.branch.color }}>
                     <selectedNode.node.icon className="text-white w-8 h-8" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: selectedNode.branch.color }}>{selectedNode.branch.name}</p>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{selectedNode.node.title}</h3>
                     <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{selectedNode.node.description}</p>
                  </div>
               </div>
               
               <div className="mt-6">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                     <span>Progresso</span>
                     <span>{progressData[selectedNode.branch.id].toFixed(1)} / {selectedNode.node.hoursRequired}h</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                     <div 
                       className="h-full transition-all duration-1000" 
                       style={{ 
                         width: `${Math.min(100, (progressData[selectedNode.branch.id] / selectedNode.node.hoursRequired) * 100)}%`,
                         backgroundColor: selectedNode.branch.color
                       }} 
                     />
                  </div>
                  {!selectedNode.unlocked && (
                     <p className="text-[10px] text-center mt-2 font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Lock size={10} /> Estude mais matérias de {selectedNode.branch.name} para desbloquear.
                     </p>
                  )}
                  {selectedNode.unlocked && (
                     <p className="text-[10px] text-center mt-2 font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-1">
                        <Star size={10} fill="currentColor" /> Título Conquistado
                     </p>
                  )}
               </div>
               
               <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-sanfran-rubi">
                  <ChevronRight className="rotate-90" />
               </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default SpecializationTree;
