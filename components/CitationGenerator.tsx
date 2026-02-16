
import React, { useState, useEffect } from 'react';
import { Quote, Book, Gavel, FileText, Globe, Copy, Check, RotateCcw, PenTool, History, Trash2, Save } from 'lucide-react';

type CitationType = 'livro' | 'jurisprudencia' | 'artigo' | 'site';

interface FormFields {
  autor: string;
  titulo: string;
  subtitulo: string;
  edicao: string;
  local: string;
  editora: string;
  ano: string;
  pagina: string;
  // Jurisprudencia
  tribunal: string;
  relator: string;
  numeroProcesso: string;
  dataJulgamento: string;
  orgaoJulgador: string;
  // Artigo
  nomeRevista: string;
  volume: string;
  numero: string;
  mes: string;
  // Site
  url: string;
  dataAcesso: string;
}

interface HistoryItem {
  id: string;
  text: string;
  html: string;
  type: CitationType;
  date: string;
}

const INITIAL_FIELDS: FormFields = {
  autor: '',
  titulo: '',
  subtitulo: '',
  edicao: '',
  local: '',
  editora: '',
  ano: '',
  pagina: '',
  tribunal: '',
  relator: '',
  numeroProcesso: '',
  dataJulgamento: '',
  orgaoJulgador: '',
  nomeRevista: '',
  volume: '',
  numero: '',
  mes: '',
  url: '',
  dataAcesso: new Date().toLocaleDateString('pt-BR')
};

const CitationGenerator: React.FC = () => {
  const [type, setType] = useState<CitationType>('livro');
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [citationHTML, setCitationHTML] = useState<string>('');
  const [citationText, setCitationText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Carregar histórico
  useEffect(() => {
    const saved = localStorage.getItem('sanfran_citation_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // Formatar Autor: Maria Helena Diniz -> DINIZ, Maria Helena
  const formatAuthor = (name: string) => {
    if (!name.trim()) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].toUpperCase();
    const lastName = parts.pop()?.toUpperCase();
    return `${lastName}, ${parts.join(' ')}`;
  };

  const generateCitation = () => {
    const f = fields;
    let html = '';
    let text = '';

    // Lógica baseada na NBR 6023
    switch (type) {
      case 'livro':
        // HTML
        if (f.autor) html += `${formatAuthor(f.autor)}. `;
        html += `<b>${f.titulo}</b>`;
        if (f.subtitulo) html += `: ${f.subtitulo}`;
        html += `. `;
        if (f.edicao) html += `${f.edicao}. ed. `;
        if (f.local) html += `${f.local}: `;
        if (f.editora) html += `${f.editora}, `;
        if (f.ano) html += `${f.ano}.`;
        if (f.pagina) html += ` p. ${f.pagina}.`;

        // Text
        if (f.autor) text += `${formatAuthor(f.autor)}. `;
        text += `${f.titulo}`; // Sem negrito
        if (f.subtitulo) text += `: ${f.subtitulo}`;
        text += `. `;
        if (f.edicao) text += `${f.edicao}. ed. `;
        if (f.local) text += `${f.local}: `;
        if (f.editora) text += `${f.editora}, `;
        if (f.ano) text += `${f.ano}.`;
        if (f.pagina) text += ` p. ${f.pagina}.`;
        break;

      case 'jurisprudencia':
        const local = f.local ? f.local.toUpperCase() : 'BRASIL';
        // HTML
        html += `${local}. `;
        if (f.tribunal) html += `${f.tribunal}. `;
        if (f.orgaoJulgador) html += `${f.orgaoJulgador}. `;
        html += `<b>${f.titulo} nº ${f.numeroProcesso}</b>. `;
        if (f.relator) html += `Relator: ${f.relator}. `;
        if (f.dataJulgamento) html += `Julgado em: ${f.dataJulgamento}. `;
        html += `Disponível em: Jurisprudência Oficial. Acesso em: ${f.dataAcesso}.`;

        // Text
        text += `${local}. `;
        if (f.tribunal) text += `${f.tribunal}. `;
        if (f.orgaoJulgador) text += `${f.orgaoJulgador}. `;
        text += `${f.titulo} nº ${f.numeroProcesso}. `;
        if (f.relator) text += `Relator: ${f.relator}. `;
        if (f.dataJulgamento) text += `Julgado em: ${f.dataJulgamento}. `;
        text += `Disponível em: Jurisprudência Oficial. Acesso em: ${f.dataAcesso}.`;
        break;

      case 'artigo':
        // HTML
        if (f.autor) html += `${formatAuthor(f.autor)}. `;
        html += `${f.titulo}. `;
        html += `<b>${f.nomeRevista}</b>`;
        if (f.local) html += `, ${f.local}`;
        if (f.volume) html += `, v. ${f.volume}`;
        if (f.numero) html += `, n. ${f.numero}`;
        if (f.pagina) html += `, p. ${f.pagina}`;
        if (f.mes) html += `, ${f.mes}.`;
        if (f.ano) html += ` ${f.ano}.`;

        // Text
        if (f.autor) text += `${formatAuthor(f.autor)}. `;
        text += `${f.titulo}. `;
        text += `${f.nomeRevista}`;
        if (f.local) text += `, ${f.local}`;
        if (f.volume) text += `, v. ${f.volume}`;
        if (f.numero) text += `, n. ${f.numero}`;
        if (f.pagina) text += `, p. ${f.pagina}`;
        if (f.mes) text += `, ${f.mes}.`;
        if (f.ano) text += ` ${f.ano}.`;
        break;

      case 'site':
        const authorSite = f.autor ? formatAuthor(f.autor) : f.titulo.toUpperCase();
        // HTML
        html += `${authorSite}. `;
        if (f.autor) html += `<b>${f.titulo}</b>. `;
        else html += `${f.titulo}. `;
        if (f.ano) html += `${f.ano}. `;
        html += `Disponível em: <${f.url}>. Acesso em: ${f.dataAcesso}.`;

        // Text
        text += `${authorSite}. `;
        if (f.autor) text += `${f.titulo}. `;
        else text += `${f.titulo}. `;
        if (f.ano) text += `${f.ano}. `;
        text += `Disponível em: <${f.url}>. Acesso em: ${f.dataAcesso}.`;
        break;
    }

    setCitationHTML(html);
    setCitationText(text);
  };

  useEffect(() => {
    generateCitation();
  }, [fields, type]);

  const addToHistory = () => {
    if (!citationText) return;
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: citationText,
      html: citationHTML,
      type,
      date: new Date().toISOString()
    };
    const newHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(newHistory);
    localStorage.setItem('sanfran_citation_history', JSON.stringify(newHistory));
  };

  const handleCopy = () => {
    addToHistory(); // Auto-save to history on copy

    const blobHTML = new Blob([citationHTML], { type: 'text/html' });
    const blobText = new Blob([citationText], { type: 'text/plain' });
    const data = [new ClipboardItem({ 
        'text/html': blobHTML,
        'text/plain': blobText
    })];

    navigator.clipboard.write(data).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
        // Fallback
        navigator.clipboard.writeText(citationText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyFromHistory = (item: HistoryItem) => {
    const blobHTML = new Blob([item.html], { type: 'text/html' });
    const blobText = new Blob([item.text], { type: 'text/plain' });
    const data = [new ClipboardItem({ 'text/html': blobHTML, 'text/plain': blobText })];
    navigator.clipboard.write(data).catch(() => navigator.clipboard.writeText(item.text));
  };

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('sanfran_citation_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    if(confirm('Limpar todo o histórico?')) {
      setHistory([]);
      localStorage.removeItem('sanfran_citation_history');
    }
  };

  const clearForm = () => {
    setFields(INITIAL_FIELDS);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFields({ ...fields, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <Quote className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Normas Técnicas</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Gerador ABNT</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Formatação automática NBR 6023 para peças e trabalhos.</p>
        </div>
        <button 
          onClick={clearForm}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Limpar Campos
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: Formulário */}
        <div className="lg:col-span-7 space-y-6">
           
           {/* Abas */}
           <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-2xl overflow-x-auto no-scrollbar">
              {[
                { id: 'livro', label: 'Livro', icon: Book },
                { id: 'jurisprudencia', label: 'Jurisprudência', icon: Gavel },
                { id: 'artigo', label: 'Artigo', icon: FileText },
                { id: 'site', label: 'Site', icon: Globe }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setType(tab.id as CitationType)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all min-w-[120px] ${type === tab.id ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   <tab.icon size={14} /> {tab.label}
                </button>
              ))}
           </div>

           {/* Formulário */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-4">
              
              {/* Campos Comuns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Autor / Responsável</label>
                    <input name="autor" value={fields.autor} onChange={handleChange} placeholder="Ex: Maria Helena Diniz" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título Principal</label>
                    <input name="titulo" value={fields.titulo} onChange={handleChange} placeholder={type === 'jurisprudencia' ? "Ex: Apelação Cível" : "Ex: Curso de Direito Civil Brasileiro"} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                 </div>
              </div>

              {/* Campos Específicos - Livro */}
              {type === 'livro' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Subtítulo (Opcional)</label>
                        <input name="subtitulo" value={fields.subtitulo} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Edição</label>
                        <input name="edicao" value={fields.edicao} onChange={handleChange} placeholder="Ex: 25" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Local (Cidade)</label>
                        <input name="local" value={fields.local} onChange={handleChange} placeholder="Ex: São Paulo" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Editora</label>
                        <input name="editora" value={fields.editora} onChange={handleChange} placeholder="Ex: Saraiva" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ano</label>
                        <input name="ano" value={fields.ano} onChange={handleChange} placeholder="2024" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Página Citada (Opcional)</label>
                      <input name="pagina" value={fields.pagina} onChange={handleChange} placeholder="Ex: 45-46" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                  </div>
                </>
              )}

              {/* Campos Específicos - Jurisprudência */}
              {type === 'jurisprudencia' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tribunal</label>
                        <input name="tribunal" value={fields.tribunal} onChange={handleChange} placeholder="Ex: Tribunal de Justiça de São Paulo" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nº do Processo</label>
                        <input name="numeroProcesso" value={fields.numeroProcesso} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Órgão Julgador</label>
                        <input name="orgaoJulgador" value={fields.orgaoJulgador} onChange={handleChange} placeholder="Ex: 4ª Câmara de Direito Privado" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Relator</label>
                        <input name="relator" value={fields.relator} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data Julgamento</label>
                        <input name="dataJulgamento" value={fields.dataJulgamento} onChange={handleChange} placeholder="DD/MM/AAAA" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Local / Estado</label>
                        <input name="local" value={fields.local} onChange={handleChange} placeholder="Ex: SÃO PAULO" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                </>
              )}

              {/* Campos Específicos - Artigo */}
              {type === 'artigo' && (
                <>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Revista</label>
                      <input name="nomeRevista" value={fields.nomeRevista} onChange={handleChange} placeholder="Ex: Revista dos Tribunais" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Volume</label>
                        <input name="volume" value={fields.volume} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número</label>
                        <input name="numero" value={fields.numero} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Páginas</label>
                        <input name="pagina" value={fields.pagina} onChange={handleChange} placeholder="10-25" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mês (abrev.)</label>
                        <input name="mes" value={fields.mes} onChange={handleChange} placeholder="jan." className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ano</label>
                        <input name="ano" value={fields.ano} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                </>
              )}

              {/* Campos Específicos - Site */}
              {type === 'site' && (
                <>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">URL (Link)</label>
                      <input name="url" value={fields.url} onChange={handleChange} placeholder="https://..." className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ano de Publicação</label>
                        <input name="ano" value={fields.ano} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Acesso</label>
                        <input name="dataAcesso" value={fields.dataAcesso} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>
                </>
              )}

           </div>
        </div>

        {/* COLUNA DIREITA: Resultado e Histórico */}
        <div className="lg:col-span-5 space-y-6">
           {/* Card de Resultado */}
           <div className="sticky top-6 bg-slate-900 dark:bg-white p-8 rounded-[3rem] shadow-2xl overflow-hidden relative min-h-[300px] flex flex-col justify-center text-center">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <PenTool size={150} className="text-white dark:text-sanfran-rubiBlack" />
              </div>

              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Citação Formatada</p>
                 
                 <div 
                    className="font-serif text-lg md:text-xl text-white dark:text-slate-900 leading-relaxed bg-white/5 dark:bg-slate-100 p-6 rounded-2xl mb-6 break-words border border-white/10"
                    dangerouslySetInnerHTML={{ __html: citationHTML || 'Preencha os campos para visualizar...' }}
                 />

                 <button 
                    onClick={handleCopy}
                    disabled={!citationHTML}
                    className={`group w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white hover:scale-105 active:scale-95'}`}
                 >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado & Salvo!' : 'Copiar e Salvar'}
                 </button>
              </div>
           </div>

           {/* Lista de Histórico */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <History size={16} /> Histórico Recente
                 </h4>
                 {history.length > 0 && (
                   <button onClick={clearHistory} className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1">
                      <Trash2 size={12} /> Limpar
                   </button>
                 )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {history.length === 0 && (
                    <div className="text-center py-8 opacity-50">
                       <p className="text-[10px] font-black uppercase">Nenhum histórico</p>
                    </div>
                 )}
                 {history.map(item => (
                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 group relative hover:border-sanfran-rubi/30 transition-all">
                       <p className="text-[9px] font-black uppercase text-slate-400 mb-1 flex justify-between">
                          <span>{item.type}</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                       </p>
                       <p className="font-serif text-xs text-slate-800 dark:text-slate-300 leading-snug line-clamp-3 mb-2">
                          {item.text}
                       </p>
                       <div className="flex gap-2 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyFromHistory(item)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-sanfran-rubi" title="Copiar">
                             <Copy size={12} />
                          </button>
                          <button onClick={() => deleteFromHistory(item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500" title="Remover">
                             <Trash2 size={12} />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CitationGenerator;
