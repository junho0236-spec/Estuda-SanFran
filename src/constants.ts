import { 
  Folder as FolderIcon, 
  Scale, 
  Book, 
  Hammer, 
  Briefcase, 
  GraduationCap, 
  Landmark, 
  Library, 
  FileText 
} from 'lucide-react';

export const FOLDER_COLORS = [
  { name: 'Dourado', border: 'border-l-usp-gold', text: 'text-usp-gold', bg: 'bg-usp-gold' },
  { name: 'Rubi', border: 'border-l-sanfran-rubi', text: 'text-sanfran-rubi', bg: 'bg-sanfran-rubi' },
  { name: 'Azul', border: 'border-l-blue-500', text: 'text-blue-500', bg: 'bg-blue-500' },
  { name: 'Esmeralda', border: 'border-l-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500' },
  { name: 'Âmbar', border: 'border-l-amber-500', text: 'text-amber-500', bg: 'bg-amber-500' },
  { name: 'Roxo', border: 'border-l-purple-500', text: 'text-purple-500', bg: 'bg-purple-500' },
  { name: 'Rosa', border: 'border-l-pink-500', text: 'text-pink-500', bg: 'bg-pink-500' },
  { name: 'Ciano', border: 'border-l-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-500' },
  { name: 'Laranja', border: 'border-l-orange-500', text: 'text-orange-500', bg: 'bg-orange-500' },
  { name: 'Indigo', border: 'border-l-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-500' },
];

export const FOLDER_ICONS = [
  { name: 'Pasta', value: 'folder', icon: FolderIcon },
  { name: 'Balança', value: 'scale', icon: Scale },
  { name: 'Livro', value: 'book', icon: Book },
  { name: 'Martelo', value: 'hammer', icon: Hammer },
  { name: 'Maleta', value: 'briefcase', icon: Briefcase },
  { name: 'Formatura', value: 'graduation', icon: GraduationCap },
  { name: 'Tribunal', value: 'landmark', icon: Landmark },
  { name: 'Biblioteca', value: 'library', icon: Library },
  { name: 'Documento', value: 'document', icon: FileText }
];
