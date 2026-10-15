/**
 * Marca d'água oficial para relatórios e documentos em Modo Demonstração.
 * Renderiza uma sombra diagonal suave e translúcida em todas as páginas do PDF.
 */
export function aplicarMarcaDaguaDemo(doc, options = {}) {
  if (!doc) return;
  const total = doc.getNumberOfPages();
  const textoPrincipal = options.texto || 'VERSÃO DEMONSTRAÇÃO';
  const textoSecundario = options.subtexto || 'DOCUMENTO DIDÁTICO / APRESENTAÇÃO · DADOS PESSOAIS ANONIMIZADOS';

  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const pageSize = doc.internal.pageSize;
    const pW = pageSize.width || pageSize.getWidth();
    const pH = pageSize.height || pageSize.getHeight();
    const ehPaisagem = pW > pH;

    doc.saveGraphicsState();
    if (doc.setGState && doc.GState) {
      try {
        doc.setGState(new doc.GState({ opacity: 0.12 }));
      } catch (_) {}
    }

    // Cor cinza-ardósia suave para efeito marca d'água / sombra no fundo
    doc.setTextColor(180, 195, 210);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(ehPaisagem ? 48 : 36);

    const angulo = ehPaisagem ? 26 : 38;
    const meioX = pW / 2;
    const meioY = pH / 2;

    // Texto principal inclinado
    doc.text(textoPrincipal, meioX, meioY - 2, { align: 'center', angle: angulo });

    // Subtítulo explicativo
    doc.setFontSize(ehPaisagem ? 11 : 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 155, 175);
    doc.text(textoSecundario, meioX, meioY + (ehPaisagem ? 14 : 12), { align: 'center', angle: angulo });

    // Tarja discreta superior indicando modo demo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // tom âmbar suave
    doc.text('[MODO DEMONSTRAÇÃO] SOMENTE LEITURA — DADOS PESSOAIS SUBSTITUÍDOS POR XXX', meioX, 5, { align: 'center' });

    doc.restoreGraphicsState();
  }
}
