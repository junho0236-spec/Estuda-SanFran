import React from 'react';
import { Scale } from 'lucide-react';

type Props = { active: boolean };

/** Conteúdo off-screen usado por `exportQuestionBankPdf` (html2canvas / jsPDF). */
export function QuestionBankPdfHiddenShell({ active }: Props) {
  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        backgroundColor: '#ffffff',
        zIndex: -1,
      }}
    >
      <div id="pdf-cover" className="p-16 bg-white flex flex-col items-center justify-center text-center h-[1100px]">
        <div className="w-32 h-32 bg-[#800020] rounded-3xl flex items-center justify-center mb-12 border border-gray-200">
          <Scale className="w-16 h-16 text-white" />
        </div>

        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4 font-serif">CADERNO DE QUESTÕES</h1>
        <h2 className="text-2xl font-bold text-[#800020] tracking-widest uppercase mb-24">
          Exame de Proficiência Jurídica
        </h2>

        <div className="w-full max-w-2xl space-y-8 text-left mb-24">
          <div className="border-b-2 border-gray-300 pb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Nome do Aluno</span>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="border-b-2 border-gray-300 pb-2">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Número USP</span>
            </div>
            <div className="border-b-2 border-gray-300 pb-2">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Data</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl bg-gray-50 p-8 rounded-2xl border border-gray-200 text-left">
          <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wider">Instruções ao Candidato</h3>
          <ul className="space-y-3 text-gray-600 text-sm font-medium list-disc list-inside">
            <li>Verifique se este caderno contém todas as questões solicitadas.</li>
            <li>Leia atentamente cada questão antes de assinalar a resposta.</li>
            <li>Preencha o gabarito ao final do caderno com caneta esferográfica de tinta azul ou preta.</li>
            <li>Não é permitido o uso de material de consulta durante a resolução.</li>
            <li>O tempo sugerido para resolução é de 3 minutos por questão.</li>
          </ul>
        </div>
      </div>

      <div
        id="pdf-header"
        className="p-8 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#800020] rounded-xl flex items-center justify-center border border-gray-200">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SANFRAN ACADEMY</h1>
            <p className="text-sm text-gray-500 font-medium">Excelência no Ensino Jurídico - XI de Agosto</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#800020]">Simulado Oficial</p>
          <p className="text-sm text-gray-500 font-medium">{new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
