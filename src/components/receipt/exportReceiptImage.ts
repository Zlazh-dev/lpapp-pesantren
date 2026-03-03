'use client'

type ExportType = 'png' | 'jpg'

type ExportReceiptImageOptions = {
    type: ExportType
    fileName: string
    pixelRatio?: number
    jpegQuality?: number
    backgroundColor?: string
}

function isCssRulesSecurityError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'SecurityError') return true
    if (!(error instanceof Error)) return false
    return /cssRules|CSSStyleSheet|Cannot access rules|SecurityError/i.test(error.message)
}

function logDevWarning(message: string, error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn(`[receipt-export] ${message}`, error)
    }
}

function downloadDataUrl(dataUrl: string, fileName: string) {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    link.click()
}

function createOffscreenClone(node: HTMLElement) {
    const stage = document.createElement('div')
    stage.setAttribute('data-receipt-export-stage', 'true')
    Object.assign(stage.style, {
        position: 'fixed',
        left: '-99999px',
        top: '0',
        zIndex: '-1',
        pointerEvents: 'none',
        overflow: 'visible',
        background: '#ffffff',
        margin: '0',
        padding: '0',
    } as CSSStyleDeclaration)

    const clone = node.cloneNode(true) as HTMLElement
    const originalRect = node.getBoundingClientRect()
    const width = Math.max(360, Math.ceil(originalRect.width || node.scrollWidth || 360))

    Object.assign(clone.style, {
        width: `${width}px`,
        maxWidth: 'none',
        height: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        transform: 'none',
        background: '#ffffff',
        margin: '0',
    } as CSSStyleDeclaration)

    stage.appendChild(clone)
    document.body.appendChild(stage)

    const height = Math.max(
        Math.ceil(clone.scrollHeight || 0),
        Math.ceil(clone.getBoundingClientRect().height || 0),
        1
    )

    return { stage, clone, width, height }
}

async function renderWithHtmlToImage(
    clone: HTMLElement,
    type: ExportType,
    pixelRatio: number,
    backgroundColor: string,
    jpegQuality: number,
    width: number,
    height: number
) {
    const { toPng, toJpeg } = await import('html-to-image')

    const common = {
        pixelRatio,
        backgroundColor,
        cacheBust: true,
        includeQueryParams: true,
        skipFonts: true,
        fontEmbedCSS: '',
        width,
        height,
    }

    if (type === 'png') {
        return toPng(clone, common)
    }

    return toJpeg(clone, {
        ...common,
        quality: jpegQuality,
    })
}

async function renderWithHtml2Canvas(
    clone: HTMLElement,
    type: ExportType,
    pixelRatio: number,
    backgroundColor: string,
    jpegQuality: number,
    width: number,
    height: number
) {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(clone, {
        backgroundColor,
        scale: pixelRatio,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
    })

    if (type === 'png') {
        return canvas.toDataURL('image/png')
    }
    return canvas.toDataURL('image/jpeg', jpegQuality)
}

export async function exportReceiptImage(node: HTMLElement, options: ExportReceiptImageOptions) {
    const {
        type,
        fileName,
        pixelRatio = 2,
        jpegQuality = 0.95,
        backgroundColor = '#ffffff',
    } = options

    const { stage, clone, width, height } = createOffscreenClone(node)

    try {
        const dataUrl = await renderWithHtmlToImage(
            clone,
            type,
            pixelRatio,
            backgroundColor,
            jpegQuality,
            width,
            height
        )
        downloadDataUrl(dataUrl, fileName)
        return
    } catch (error) {
        if (!isCssRulesSecurityError(error)) {
            logDevWarning('html-to-image failed, fallback to html2canvas.', error)
        } else {
            logDevWarning('Cross-origin stylesheet blocked cssRules. Using html2canvas fallback.', error)
        }

        try {
            const dataUrl = await renderWithHtml2Canvas(
                clone,
                type,
                pixelRatio,
                backgroundColor,
                jpegQuality,
                width,
                height
            )
            downloadDataUrl(dataUrl, fileName)
        } catch (fallbackError) {
            logDevWarning('Fallback export failed.', fallbackError)
            throw fallbackError
        }
    } finally {
        stage.remove()
    }
}

