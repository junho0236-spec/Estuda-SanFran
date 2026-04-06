
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Banknote, 
  ArrowUpRight, 
  Clock, 
  AlertCircle,
  Gavel,
  ShieldCheck,
  Scale,
  Building2,
  ChevronRight,
  ExternalLink,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { EDITAIS_LIST_COLUMNS } from '../utils/supabaseSelectColumns';
import { Edital } from '../types';
import { toast } from 'sonner';

interface EditaisProps {
  userId: string;
}

const Editais: React.FC<EditaisProps> = ({ userId }) => {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  // Mock data for initial implementation
  const mockEditais: Edital[] = [
    {
      id: '1',
      title: 'Magistratura Federal - TRF3',
      institution: 'TRF 3ª Região',
      status: 'Aberto',
      category: 'Magistratura',
      salary: 'R$ 35.845,00',
      deadline: '2024-05-20',
      region: 'SP/MS',
      link: 'https://www.trf3.jus.br/',
      description: 'Concurso para Juiz Federal Substituto. 20 vagas imediatas + CR.'
    },
    {
      id: '2',
      title: 'Ministério Público de São Paulo',
      institution: 'MPSP',
      status: 'Previsto',
      category: 'MP',
      salary: 'R$ 32.355,00',
      region: 'São Paulo',
      description: '96º Concurso de Ingresso na Carreira do Ministério Público. Comissão formada.'
    },
    {
      id: '3',
      title: 'Defensoria Pública do Rio de Janeiro',
      institution: 'DPGE RJ',
      status: 'Inscrições Abertas',
      category: 'Defensoria',
      salary: 'R$ 29.600,00',
      deadline: '2024-04-15',
      region: 'Rio de Janeiro',
      link: 'https://www.defensoria.rj.def.br/',
      description: 'XXVIII Concurso para ingresso na classe inicial da carreira de Defensor Público.'
    },
    {
      id: '4',
      title: 'Procuradoria Geral do Estado de Minas Gerais',
      institution: 'PGE MG',
      status: 'Previsto',
      category: 'Procuradoria',
      salary: 'R$ 31.200,00',
      region: 'Minas Gerais',
      description: 'Novo concurso autorizado para Procurador do Estado.'
    },
    {
      id: '5',
      title: 'Magistratura Estadual - TJSP',
      institution: 'TJSP',
      status: 'Encerrado',
      category: 'Magistratura',
      salary: 'R$ 34.000,00',
      region: 'São Paulo',
      description: '190º Concurso de Ingresso na Magistratura.'
    }
  ];

  useEffect(() => {
    loadEditais();
  }, []);

  const loadEditais = async () => {
    setLoading(true);
    try {
      // Tenta buscar do Supabase, se falhar ou estiver vazio, usa mock
      const { data, error } = await supabase
        .from('editais')
        .select(EDITAIS_LIST_COLUMNS)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setEditais(mockEditais);
      } else {
        setEditais(data as Edital[]);
      }
    } catch (e) {
      console.warn("Usando dados mockados para Radar de Editais.");
      setEditais(mockEditais);
    } finally {
      setLoading(false);
    }
  };

  const filteredEditais = editais.filter(edital => {
    const matchesSearch = edital.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         edital.institution?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Todos' || edital.category === filterCategory;
    const matchesStatus = filterStatus === 'Todos' || edital.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'Inscrições Abertas': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'Previsto': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'Encerrado': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Magistratura': return <Gavel className="w-4 h-4" />;
      case 'MP': return <ShieldCheck className="w-4 h-4" />;
      case 'Defensoria': return <Scale className="w-4 h-4" />;
      case 'Procuradoria': return <Building2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header Editorial */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/20 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-800">
            <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Inteligência em Concursos</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">
            Radar de <span className="text-indigo-600">Editais.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl">
            Monitoramento em tempo real de concursos jurídicos de alto nível. Filtre por carreira, status e região.
          </p>
        </div>

        <button 
          onClick={() => toast.info("Você será notificado sobre novos editais!")}
          className="flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all group"
        >
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alertas Ativos</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">Ativar Notificações</p>
          </div>
        </button>
      </header>

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="relative col-span-1 md:col-span-1 lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por instituição ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Filtro Carreira */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="Todos">Todas Carreiras</option>
              <option value="Magistratura">Magistratura</option>
              <option value="MP">Ministério Público</option>
              <option value="Defensoria">Defensoria</option>
              <option value="Procuradoria">Procuradoria</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="Todos">Todos Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Inscrições Abertas">Inscrições Abertas</option>
              <option value="Previsto">Previsto</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Editais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEditais.length > 0 ? (
          filteredEditais.map((edital) => (
            <div 
              key={edital.id}
              className="group bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-500 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(edital.status)}`}>
                    {edital.status}
                  </div>
                  <div className="text-slate-300 dark:text-slate-600">
                    {getCategoryIcon(edital.category)}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                    {edital.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {edital.institution}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {edital.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                      <MapPin className="w-3 h-3" /> Região
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{edital.region}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                      <Banknote className="w-3 h-3" /> Subsídio
                    </div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{edital.salary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                {edital.link ? (
                  <a 
                    href={edital.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white transition-all"
                  >
                    Ver Edital <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <button 
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 text-slate-400 py-4 rounded-2xl text-xs font-black uppercase tracking-widest cursor-not-allowed"
                  >
                    Aguardando Publicação
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-slate-100 dark:bg-white/5 p-6 rounded-full">
              <Search className="w-12 h-12 text-slate-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nenhum edital encontrado</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tente ajustar seus filtros ou termo de busca.</p>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); setFilterCategory('Todos'); setFilterStatus('Todos'); }}
              className="text-indigo-600 font-black uppercase text-xs tracking-widest hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="bg-indigo-600 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
              Não perca o prazo da sua aprovação.
            </h2>
            <p className="text-indigo-100 font-medium text-lg">
              Receba notificações exclusivas sobre editais previstos e autorizados diretamente no seu e-mail ou WhatsApp.
            </p>
          </div>
          <button className="bg-white text-indigo-600 px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1">
            Configurar Alertas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editais;
