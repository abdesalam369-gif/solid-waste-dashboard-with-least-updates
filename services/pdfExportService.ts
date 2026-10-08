import React from 'react';
import jsPDF from 'jspdf';

declare var html2canvas: any;

export interface PdfExportOptions {
    fileName?: string;
    title?: string;
    subtitle?: string;
    orientation?: 'portrait' | 'landscape';
    includeHeader?: boolean;
    includeFooter?: boolean;
    pageFormat?: 'a4' | 'letter';
    scale?: number;
    marginMm?: number;
    onProgress?: (status: string, percent: number) => void;
}

/**
 * Ensures SVG elements (Recharts) are properly cloned and have explicit dimensions
 * so html2canvas renders them with full fidelity.
 */
function prepareSvgsForCapture(container: HTMLElement) {
    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            if (!svg.getAttribute('width')) svg.setAttribute('width', `${rect.width}`);
            if (!svg.getAttribute('height')) svg.setAttribute('height', `${rect.height}`);
            if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        }
    });
}

/**
 * Exports an HTML element directly to a downloadable PDF file using jsPDF and html2canvas.
 * Supports multi-page splitting for tall reports with proper A4 aspect ratios.
 */
export async function exportElementToPdf(
    element: HTMLElement,
    options: PdfExportOptions = {}
): Promise<void> {
    const {
        fileName = 'Municipal_Management_Report',
        orientation = 'portrait',
        pageFormat = 'a4',
        scale = 2,
        marginMm = 10,
        title,
        subtitle,
        onProgress
    } = options;

    onProgress?.('تحضير العناصر والرسوم البيانية...', 20);

    // Make sure SVG elements are ready for html2canvas
    prepareSvgsForCapture(element);

    // Wait 250ms for any SVG style updates or animations to settle
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.('معالجة الصور والرسومات عالية الدقة...', 50);

    // Capture using html2canvas
    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    onProgress?.('بناء صفحات مستند الـ PDF...', 75);

    const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageFormat,
        compress: true,
    });

    // Page dimensions
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;

    const contentWidth = pageWidth - marginMm * 2;
    const contentHeight = pageHeight - marginMm * 2;

    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // How many canvas pixels correspond to one full PDF page content height
    const canvasPageHeight = (contentHeight * canvasWidth) / contentWidth;
    const totalPages = Math.max(1, Math.ceil(canvasHeight / canvasPageHeight));

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage(pageFormat, orientation);
        }

        // Calculate the slice of the original canvas
        const sourceY = pageIndex * canvasPageHeight;
        const sourceHeight = Math.min(canvasPageHeight, canvasHeight - sourceY);

        // Create temporary canvas for this slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = sourceHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, sourceHeight);
            ctx.drawImage(
                canvas,
                0,
                sourceY,
                canvasWidth,
                sourceHeight,
                0,
                0,
                canvasWidth,
                sourceHeight
            );
        }

        const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = (sourceHeight * contentWidth) / canvasWidth;

        pdf.addImage(
            sliceDataUrl,
            'JPEG',
            marginMm,
            marginMm,
            contentWidth,
            sliceHeightMm,
            undefined,
            'FAST'
        );

        // Add page footer with page number
        pdf.setFontSize(8);
        pdf.setTextColor(140, 150, 160);
        const footerY = pageHeight - 4;
        pdf.text(
            `بلدية مؤتة والمزار - نظام إدارة النفايات الصلبة | صفحة ${pageIndex + 1} من ${totalPages}`,
            pageWidth / 2,
            footerY,
            { align: 'center' }
        );
    }

    onProgress?.('اكتمل تجهيز التقرير، جاري التحميل...', 95);

    // Clean filename
    const sanitizedFileName = (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`).replace(/[\\/:*?"<>|]/g, '_');
    pdf.save(sanitizedFileName);

    onProgress?.('تم التحميل بنجاح!', 100);
}

/**
 * Prints an element using a hidden iframe to bypass popup blocker restrictions.
 */
export function printElementDirectly(element: HTMLElement, title: string = 'Management Report'): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Cairo', sans-serif;
                    direction: rtl;
                    background: #ffffff;
                    color: #0f172a;
                    margin: 0;
                    padding: 15mm;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div>${element.outerHTML}</div>
        </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 600);
}
