import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type Props = {
  message: string | null;
  type: 'success' | 'error' | null;
};

export function QuestionBankNotificationToast({ message, type }: Props) {
  if (!message || !type) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
}
