// exportProposta.js — utility per generare il docx Proposta di Miglioramento
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  } from 'docx';
  
  const NAVY = '001d47';
  const GRAY = '475569';
  
  export async function exportPropostaDocx({ destinatario, titoloDoc, sistema, sviluppi }) {
    const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nomeFile = 'Proposta_' + (titoloDoc || 'Sviluppo').replace(/\s+/g, '_') + '_' + (destinatario || 'Cliente').replace(/\s+/g, '_');
  
    const nb = {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    };
    const tb = {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    };
  
    const children = [];
  
    // Intestazione testo
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Proposta di Miglioramento - ' + titoloDoc, bold: true, size: 22, color: NAVY }),
        new TextRun({ text: '   |   ' + dataOggi + '   |   Destinatario: ' + destinatario, size: 18, color: GRAY }),
      ],
      spacing: { after: 120 },
    }));
  
    // Box navy header
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: nb,
      rows: [new TableRow({
        children: [new TableCell({
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          borders: nb,
          width: { size: 100, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Proposta di Miglioramento', bold: true, size: 36, color: 'FFFFFF' })], alignment: AlignmentType.LEFT, spacing: { before: 200, after: 60 } }),
            new Paragraph({ children: [new TextRun({ text: titoloDoc + ' - Modulo ' + sistema, size: 24, color: 'BFD4E8' })], alignment: AlignmentType.LEFT, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Data: ' + dataOggi + '   |   Destinatario: ' + destinatario + '   |   Revisione: 1.0', size: 18, color: 'BFD4E8' })], spacing: { after: 240 } }),
          ],
        })],
      })],
    }));
  
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  
    // Introduzione
    children.push(new Paragraph({ text: 'Introduzione', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Il presente documento descrive una serie di miglioramenti funzionali previsti per il modulo ' + sistema + ', emersi dall\u2019analisi delle esigenze operative. Per ciascun intervento viene illustrata la situazione attuale e la soluzione proposta.', size: 22 })],
      spacing: { after: 120 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Il documento \u00e8 predisposto per supportare la valutazione e l\u2019approvazione degli interventi proposti.', size: 22 })],
      spacing: { after: 360 },
    }));
  
    // Sviluppi
    sviluppi.forEach(function(s, idx) {
      children.push(new Paragraph({ text: (idx + 1) + '. ' + s.titolo, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 80 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'Sviluppo a cura di ZCS', italics: true, size: 20, color: GRAY })], spacing: { after: 200 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'Situazione attuale', bold: true, size: 22 })], spacing: { before: 160, after: 80 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: s.situazioneAttuale || '-', size: 22 })], spacing: { after: 160 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'Soluzione proposta', bold: true, size: 22 })], spacing: { before: 160, after: 80 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: s.soluzioneProposta || '-', size: 22 })], spacing: { after: 200 } }));
    });
  
    // Riepilogo
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
    children.push(new Paragraph({ text: 'Riepilogo degli Interventi', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 } }));
  
    const hRow = new TableRow({
      children: ['N\u00b0', 'Intervento', 'Sviluppo', 'Oneri economici'].map(function(h) {
        return new TableCell({
          shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: tb,
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })] })],
        });
      }),
      tableHeader: true,
    });
  
    const dRows = sviluppi.map(function(s, idx) {
      return new TableRow({
        children: [
          new TableCell({ borders: tb, children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 20 })] })] }),
          new TableCell({ borders: tb, children: [new Paragraph({ children: [new TextRun({ text: s.titolo || '-', size: 20 })] })] }),
          new TableCell({ borders: tb, children: [new Paragraph({ children: [new TextRun({ text: 'ZCS', size: 20 })] })] }),
          new TableCell({ borders: tb, children: [new Paragraph({ children: [new TextRun({ text: s.oneri || 'ZCS', size: 20 })] })] }),
        ],
      });
    });
  
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hRow].concat(dRows) }));
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Documento riservato', size: 18, color: GRAY, italics: true })], alignment: AlignmentType.CENTER }));
  
    // Genera e scarica
    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: children,
      }],
    });
  
    const buf = await Packer.toBuffer(doc);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile + '.docx';
    a.click();
    URL.revokeObjectURL(url);
  }