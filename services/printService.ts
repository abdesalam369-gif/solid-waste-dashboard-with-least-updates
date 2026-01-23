
import React from 'react';

// Define the filter type for clarity
interface PrintFilters {
    vehicles: Set<string>;
    months: Set<string>;
}

// Helper function to generate a subtitle based on active filters
export const createFilterSubtitle = (filters: PrintFilters, t: (k: string) => string): string => {
    const parts: string[] = [];
    if (filters.vehicles.size > 0) {
        const vehicleList = [...filters.vehicles].slice(0, 3).join(', ');
        const moreVehicles = filters.vehicles.size > 3 ? ` ${t('print_other')} ${filters.vehicles.size - 3}` : '';
        parts.push(`${t('print_vehicles_filter')} ${vehicleList}${moreVehicles}`);
    }
    if (filters.months.size > 0) {
        parts.push(`${t('print_months_filter')} (${filters.months.size})`);
    }
    if (parts.length === 0) {
        return t('print_all_data');
    }
    return `${t('print_applied_filters')} ${parts.join(' | ')}`;
};

// The core print window generation logic
const generatePrintWindow = (title: string, subtitle: string, bodyContent: string, customStyles: string, language: string, t: (k: string) => string) => {
    const isAr = language === 'ar';
    const locale = isAr ? 'ar-EG-u-nu-latn' : 'en-US';
    const today = new Date().toLocaleDateString(locale, {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const printContent = `
        <html>
        <head>
            <title>${t('print')} | ${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
                    direction: ${isAr ? 'rtl' : 'ltr'};
                    margin: 0;
                    background-color: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .print-container {
                    padding: 1.5cm;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #666;
                    padding-bottom: 15px;
                }
                .print-header h1 { font-size: 22px; margin: 0; color: #1e3a8a; }
                .print-header h2 { font-size: 16px; margin: 5px 0 0; color: #4b5563; }
                .print-header .subtitle { font-size: 13px; margin: 8px 0 0; color: #555; font-style: italic; }
                
                @page {
                    size: A4;
                    margin: 0;
                }
                
                @media print {
                    body { margin: 0; }
                    .print-header {
                        padding-top: 1cm;
                    }
                }
                ${customStyles}
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="print-header">
                    <h1>${title}</h1>
                    <h2>${t('print_municipality')} - ${today}</h2>
                    <p class="subtitle">${subtitle}</p>
                </div>
                <div class="print-body" id="print-content">
                    ${bodyContent}
                </div>
            </div>
            <script>
                // تأكيد الطباعة بعد تحميل جميع الصور (خاصة الـ Base64)
                window.onload = function() {
                    const images = document.getElementsByTagName('img');
                    let loadedCount = 0;
                    if (images.length === 0) {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    } else {
                        for (let i = 0; i < images.length; i++) {
                            if (images[i].complete) {
                                loadedCount++;
                                if (loadedCount === images.length) {
                                    window.print();
                                    setTimeout(() => window.close(), 500);
                                }
                            } else {
                                images[i].onload = function() {
                                    loadedCount++;
                                    if (loadedCount === images.length) {
                                        window.print();
                                        setTimeout(() => window.close(), 500);
                                    }
                                };
                            }
                        }
                    }
                };
            </script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
        alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة للطباعة.' : 'Please allow popups for printing.');
        return null;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    return printWindow;
};

/**
 * دالة محسنة لتحويل SVG الخاص بـ Recharts إلى صورة PNG
 * تقوم بنسخ الأنماط المحسوبة لضمان مظهر مطابق للواقع
 */
const convertChartToPng = (chartContainerRef: React.RefObject<HTMLDivElement>): Promise<string> => {
    return new Promise((resolve, reject) => {
        // ننتظر قليلاً للتأكد من انتهاء حركات الأنيميشن في الشارت
        setTimeout(() => {
            if (!chartContainerRef.current) {
                return reject(new Error('Container not found.'));
            }
            const svgEl = chartContainerRef.current.querySelector('svg');
            if (!svgEl) {
                return reject(new Error('SVG not found.'));
            }

            try {
                const { width, height } = chartContainerRef.current.getBoundingClientRect();
                
                // إنشاء نسخة من الـ SVG لتعديلها دون التأثير على الواجهة
                const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
                svgClone.setAttribute('width', String(width));
                svgClone.setAttribute('height', String(height));
                svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
                
                // إضافة خلفية بيضاء لأن الـ SVG غالباً ما يكون شفافاً
                const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bg.setAttribute('width', '100%');
                bg.setAttribute('height', '100%');
                bg.setAttribute('fill', 'white');
                svgClone.insertBefore(bg, svgClone.firstChild);

                // استخراج النصوص والخطوط لضمان دقة الألوان في الطباعة
                const labels = svgEl.querySelectorAll('text');
                const clonedLabels = svgClone.querySelectorAll('text');
                labels.forEach((label, i) => {
                    const style = window.getComputedStyle(label);
                    if (clonedLabels[i]) {
                        (clonedLabels[i] as SVGTextElement).style.fontFamily = style.fontFamily;
                        (clonedLabels[i] as SVGTextElement).style.fontSize = style.fontSize;
                        (clonedLabels[i] as SVGTextElement).style.fill = style.fill;
                    }
                });

                const svgData = new XMLSerializer().serializeToString(svgClone);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas context error.'));

                    // دقة أعلى للطباعة (2x)
                    const scale = 2;
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    ctx.scale(scale, scale);
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const pngData = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    resolve(pngData);
                };
                img.onerror = () => reject(new Error('Image loading error.'));
                img.src = url;
            } catch (e) {
                reject(e);
            }
        }, 500); // وقت انتظار كافٍ لثبات الشارت
    });
};


export const printChart = async (chartContainerRef: React.RefObject<HTMLDivElement>, title: string, filters: PrintFilters, t: (k: string) => string, language: string) => {
    try {
        const pngFile = await convertChartToPng(chartContainerRef);
        const customStyles = `
            .print-body { text-align: center; margin-top: 20px; }
            img.chart-image {
                max-width: 100%;
                height: auto;
                border: 1px solid #eee;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
        `;
        const subtitle = createFilterSubtitle(filters, t);
        const bodyContent = `<img src="${pngFile}" class="chart-image" alt="${title}" />`;
        
        // الدالة الآن تدير عملية الطباعة داخلياً عبر الـ script المحقون
        generatePrintWindow(title, subtitle, bodyContent, customStyles, language, t);
        
    } catch (error: any) {
        console.error("Chart printing error:", error);
        alert(language === 'ar' ? 'فشل تحويل الرسم البياني للطباعة.' : 'Failed to convert chart for printing.');
    }
};

export const printTable = (tableContainerRef: React.RefObject<HTMLDivElement>, title: string, filters: PrintFilters, t: (k: string) => string, language: string) => {
    if (!tableContainerRef.current) return;
    const tableEl = tableContainerRef.current.querySelector('table');
    if (!tableEl) return;

    const customStyles = `
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            page-break-inside: auto;
        }
        thead {
            display: table-header-group;
            background-color: #f3f4f6 !important;
        }
        tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 5px;
            text-align: center;
        }
        th { font-weight: 600; }
        .underutilized { background-color: #fee2e2 !important; }
    `;
    const subtitle = createFilterSubtitle(filters, t);
    const bodyContent = tableEl.outerHTML;
    generatePrintWindow(title, subtitle, bodyContent, customStyles, language, t);
};

export const printAiReport = (reportContent: string, title: string, filters: PrintFilters, t: (k: string) => string, language: string) => {
    const cleanedReport = reportContent.trim();
    const bodyContent = `<pre class="ai-report-content">${cleanedReport}</pre>`;
    const isAr = language === 'ar';

    const customStyles = `
        .ai-report-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
            font-size: 11pt;
            line-height: 1.8;
            color: #1e293b;
            text-align: ${isAr ? 'right' : 'left'};
        }
    `;

    const subtitle = createFilterSubtitle(filters, t);
    generatePrintWindow(title, subtitle, bodyContent, customStyles, language, t);
};
