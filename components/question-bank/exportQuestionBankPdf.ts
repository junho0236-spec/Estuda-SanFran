import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Question } from '../../types';

export type ExportPdfCallbacks = {
  setIsExporting: (v: boolean) => void;
  setExportProgress: (n: number) => void;
};

/**
 * Gera PDF do simulado/caderno a partir de `#pdf-cover` e `#pdf-header` no DOM
 * e do texto das questões filtradas.
 */
export async function exportQuestionBankPdf(
  filteredQuestions: Question[],
  { setIsExporting, setExportProgress }: ExportPdfCallbacks
): Promise<void> {
  setIsExporting(true);
  setExportProgress(0);

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    const addWatermark = (page: number) => {
      doc.setPage(page);

      doc.setDrawColor(122, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(5, 5, 200, 287);
      doc.setLineWidth(0.2);
      doc.rect(7, 7, 196, 283);

      doc.setLineWidth(0.5);
      doc.line(5, 10, 10, 5);
      doc.line(205, 5, 200, 10);
      doc.line(5, 282, 10, 287);
      doc.line(205, 287, 200, 282);

      doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('SANFRAN ACADEMY', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });

      doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      doc.setTextColor(0, 0, 0);
    };

    let processedElements = 0;
    const totalElements = filteredQuestions.length + 3;

    const coverEl = document.getElementById('pdf-cover');
    if (coverEl) {
      let canvas: HTMLCanvasElement | null = await html2canvas(coverEl, { scale: 1.5, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      canvas = null;
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight, undefined, 'FAST');
      processedElements++;
      setExportProgress(Math.round((processedElements / totalElements) * 100));

      doc.addPage();
      currentY = margin;
    }

    const headerEl = document.getElementById('pdf-header');
    if (headerEl) {
      let canvas: HTMLCanvasElement | null = await html2canvas(headerEl, { scale: 1.5, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      canvas = null;
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight, undefined, 'FAST');
      currentY += imgHeight + 10;
      processedElements++;
      setExportProgress(Math.round((processedElements / totalElements) * 100));
    }

    for (let i = 0; i < filteredQuestions.length; i++) {
      const q = filteredQuestions[i];

      doc.setFontSize(11);
      doc.setFont('times', 'normal');

      const statementLines = doc.splitTextToSize(q.statement, contentWidth - 20);
      const statementHeight = statementLines.length * 6;

      let optionsHeight = 0;
      const optionsLines: string[][] = [];

      q.options.forEach(opt => {
        const lines = doc.splitTextToSize(opt, contentWidth - 30);
        optionsLines.push(lines);
        optionsHeight += lines.length * 6 + 4;
      });

      const cardHeight = statementHeight + optionsHeight + 20;

      if (currentY + cardHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 3, 3, 'FD');

      let cardY = currentY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(122, 0, 0);
      doc.text(`${i + 1}.`, margin + 5, cardY);

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(statementLines, margin + 15, cardY, { align: 'left', maxWidth: contentWidth - 20 });

      cardY += statementHeight + 5;

      q.options.forEach((opt, optIdx) => {
        const lines = optionsLines[optIdx];

        doc.setDrawColor(150, 150, 150);
        doc.rect(margin + 15, cardY - 4, 4, 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(String.fromCharCode(65 + optIdx), margin + 17, cardY - 0.5, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(lines, margin + 22, cardY, { align: 'left', maxWidth: contentWidth - 30 });

        cardY += lines.length * 6 + 4;
      });

      currentY += cardHeight + 5;

      processedElements++;
      setExportProgress(Math.round((processedElements / totalElements) * 100));

      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    doc.addPage();
    currentY = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(122, 0, 0);
    doc.text('Cartão de Respostas', pageWidth / 2, currentY + 10, { align: 'center' });

    let akCurrentY = currentY + 25;
    const cols = 2;
    const colWidth = contentWidth / cols;
    const rowHeight = 12;

    doc.setFontSize(11);

    for (let i = 0; i < filteredQuestions.length; i++) {
      const q = filteredQuestions[i];
      const col = i % cols;

      if (col === 0 && i > 0) {
        akCurrentY += rowHeight;
      }

      if (akCurrentY > pageHeight - margin - 20 && col === 0) {
        doc.addPage();
        akCurrentY = margin + 10;
      }

      const x = margin + col * colWidth;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${i + 1}.`, x + 5, akCurrentY);

      for (let lIdx = 0; lIdx < Math.min(5, q.options.length); lIdx++) {
        const letterX = x + 20 + lIdx * 12;
        const isCorrect = q.correct_answer === lIdx;

        if (isCorrect) {
          doc.setFillColor(122, 0, 0);
          doc.circle(letterX + 2, akCurrentY - 1.5, 3.5, 'F');
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setDrawColor(150, 150, 150);
          doc.circle(letterX + 2, akCurrentY - 1.5, 3.5, 'S');
          doc.setTextColor(100, 100, 100);
        }

        doc.setFontSize(9);
        doc.text(String.fromCharCode(65 + lIdx), letterX + 2, akCurrentY, { align: 'center' });
      }
    }

    processedElements++;
    setExportProgress(Math.round((processedElements / totalElements) * 100));

    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      addWatermark(i);
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text('SanFran Academy - XI de Agosto', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i}`, pageWidth / 2, pageHeight - 11, { align: 'center' });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    doc.save('simulado-sanfran.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Erro ao gerar o PDF. Verifique o console para mais detalhes.');
  } finally {
    setIsExporting(false);
    setExportProgress(0);
  }
}
