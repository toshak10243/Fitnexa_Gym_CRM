/**
 * Standalone HTML Print Utility
 * Clones the printable document container into an isolated iframe with clean
 * typography and print styling, ensuring zero UI chrome or sidebars leak into PDF.
 */
export function printHtmlElement(elementId: string, documentTitle: string = 'Document') {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  // Find or create hidden printing iframe
  let iframe = document.getElementById('trifit-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'trifit-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Extract Tailwind and app styles
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background-color: #FFFFFF !important;
            color: #111827 !important;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .printable-document {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #FFFFFF !important;
          }
          .invoice-print-canvas {
            min-height: 277mm !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .invoice-print-canvas .invoice-footer {
            margin-top: auto !important;
          }
          tr, .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="printable-document ${sourceEl.className}">
          ${sourceEl.innerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();
  // Chromium uses the print document title as the default Save as PDF name.
  // Set it explicitly after writing the iframe so the invoice filename is
  // based on the requested document title rather than the SPA title.
  iframeDoc.title = documentTitle;

  // Wait briefly for images and fonts to finish rendering in iframe
  setTimeout(() => {
    try {
      const previousTitle = document.title;
      document.title = documentTitle;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.title = previousTitle; }, 500);
    } catch {
      window.print();
    }
  }, 350);
}



