/**
 * Geração do PDF do contrato no próprio navegador.
 *
 * Por que não usar `window.print()`:
 * a caixa de impressão do Chrome injeta cabeçalho e rodapé próprios — data e
 * hora do momento da impressão, título da aba (que era o número do contrato,
 * ex. "VND-0001") e a URL do sistema. Isso depende de uma caixa de seleção do
 * usuário e NÃO é removível de forma confiável por CSS (`@page { margin: 0 }`
 * apenas às vezes esconde). Rasterizando o documento e montando o PDF aqui,
 * o arquivo contém somente o contrato.
 */

const A4 = { widthMm: 210, heightMm: 297 }

/**
 * Redução máxima aceita para forçar o contrato em uma única página.
 * 0.75 equivale a ~33% de conteúdo extra absorvido; abaixo disso o texto fica
 * pequeno demais para um documento assinado e é melhor usar duas páginas.
 */
const MIN_SINGLE_PAGE_SCALE = 0.75

/** Espera as imagens do nó terminarem de carregar antes de rasterizar. */
async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true })
              // Uma imagem que falhou não deve travar o download
              img.addEventListener('error', () => resolve(), { once: true })
            }),
    ),
  )
}

/**
 * Procura, a partir do fim ideal da página, a última linha totalmente branca
 * para usar como corte — evita partir uma linha de texto ao meio entre páginas.
 * Se não achar nada em até 15% da altura da página, corta na altura cheia.
 */
function makeBreakFinder(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  return (sliceTop: number, pageHeightPx: number): number => {
    if (!ctx) return pageHeightPx

    const maxLookback = Math.floor(pageHeightPx * 0.15)
    const bottom = sliceTop + pageHeightPx

    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, bottom - maxLookback, canvas.width, maxLookback).data
    } catch {
      // Canvas "tainted" por imagem externa: mantém o corte na altura cheia
      return pageHeightPx
    }

    for (let row = maxLookback - 1; row >= 0; row--) {
      let isBlank = true
      for (let x = 0; x < canvas.width; x++) {
        const i = (row * canvas.width + x) * 4
        // Tolerância para antialiasing: quase branco conta como branco
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          isBlank = false
          break
        }
      }
      if (isBlank) return pageHeightPx - (maxLookback - 1 - row)
    }

    return pageHeightPx
  }
}

/**
 * Rasteriza o elemento e o distribui em páginas A4.
 * `fileName` é usado apenas como nome do arquivo, não aparece no conteúdo.
 */
export async function downloadContractPdf(node: HTMLElement, fileName: string) {
  const pdf = await buildContractPdf(node)
  pdf.save(`${fileName}.pdf`)
}

/**
 * Gera o mesmo PDF e abre a caixa de impressão do navegador direto, sem
 * baixar o arquivo. O PDF é carregado num iframe oculto e impresso de lá;
 * se o navegador bloquear a impressão do iframe, abre o PDF numa nova aba
 * (com autoPrint embutido) como alternativa.
 */
export async function printContractPdf(node: HTMLElement) {
  const pdf = await buildContractPdf(node)
  pdf.autoPrint()
  const blob = pdf.output('blob')
  const url = URL.createObjectURL(blob)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.src = url

  const cleanup = () => {
    iframe.remove()
    URL.revokeObjectURL(url)
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // Mantém o iframe vivo enquanto a caixa de impressão estiver aberta
      window.setTimeout(cleanup, 60_000)
    } catch {
      cleanup()
      window.open(URL.createObjectURL(blob), '_blank')
    }
  }

  document.body.appendChild(iframe)
}

async function buildContractPdf(node: HTMLElement) {
  // Import dinâmico: as duas libs só são baixadas quando o usuário pede o PDF
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  await waitForImages(node)

  // O documento é exibido dentro de um wrapper com `transform: scale` para
  // caber na tela. O html2canvas mede o elemento já transformado, o que geraria
  // um PDF em baixa resolução, então o scale é desligado durante a captura.
  const scaled = node.closest<HTMLElement>('[data-fit-to-width]')
  const previousTransform = scaled?.style.transform ?? ''
  if (scaled) scaled.style.transform = 'none'

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(node, {
      // 2x para o texto não sair serrilhado no PDF
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })
  } finally {
    // Restaura sempre, inclusive se a rasterização falhar
    if (scaled) scaled.style.transform = previousTransform
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // A largura do documento corresponde à largura útil da página A4
  const pxPerMm = canvas.width / A4.widthMm
  const pageHeightPx = Math.floor(A4.heightMm * pxPerMm)
  const contentHeightMm = canvas.height / pxPerMm

  // Passou pouco de uma página: reduz o conteúdo para caber em uma só, em vez
  // de jogar três linhas órfãs para a segunda página. Abaixo de
  // MIN_SINGLE_PAGE_SCALE o texto ficaria pequeno demais e aí vale paginar.
  const fitScale = A4.heightMm / contentHeightMm

  if (fitScale >= MIN_SINGLE_PAGE_SCALE) {
    const drawScale = Math.min(1, fitScale)
    const widthMm = A4.widthMm * drawScale
    const heightMm = contentHeightMm * drawScale

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      // Centraliza na horizontal quando houve redução
      (A4.widthMm - widthMm) / 2,
      0,
      widthMm,
      heightMm,
    )
    return pdf
  }

  const findBreak = makeBreakFinder(canvas)

  let sliceTop = 0
  let page = 0

  while (sliceTop < canvas.height) {
    const remaining = canvas.height - sliceTop
    // Ajusta o corte para uma faixa em branco, para não partir linhas de texto
    const sliceHeight =
      remaining <= pageHeightPx ? remaining : findBreak(sliceTop, pageHeightPx)

    // Recorta a faixa correspondente à página
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight
    const ctx = pageCanvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível preparar o PDF')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      sliceTop,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    )

    if (page > 0) pdf.addPage()
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      A4.widthMm,
      sliceHeight / pxPerMm,
    )

    sliceTop += sliceHeight
    page++
  }

  return pdf
}
