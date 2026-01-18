import React from 'react';

// Define the filter type for clarity
interface PrintFilters {
    vehicles: Set<string>;
    months: Set<string>;
}

// Helper function to generate a subtitle based on active filters
export const createFilterSubtitle = (filters: PrintFilters): string => {
    const parts: string[] = [];
    if (filters.vehicles.size > 0) {
        const vehicleList = [...filters.vehicles].slice(0, 3).join(', ');
        const moreVehicles = filters.vehicles.size > 3 ? ` و ${filters.vehicles.size - 3} أخرى` : '';
        parts.push(`المركبات: ${vehicleList}${moreVehicles}`);
    }
    if (filters.months.size > 0) {
        parts.push(`الأشهر (${filters.months.size})`);
    }
    if (parts.length === 0) {
        return 'جميع البيانات معروضة (لا توجد فلاتر)';
    }
    return `الفلاتر المطبقة: ${parts.join(' | ')}`;
};

// The core print window generation logic
const generatePrintWindow = (title: string, subtitle: string, bodyContent: string, customStyles: string) => {
    const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const printContent = `
        <html>
        <head>
            <title>طباعة | ${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Cairo', sans-serif;
                    direction: rtl;
                    margin: 0;
                    background-color: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .print-container {
                    padding: 1.5cm; /* Standard A4 margins */
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
                    <h2>بلدية مؤتة والمزار - ${today}</h2>
                    <p class="subtitle">${subtitle}</p>
                </div>
                <div class="print-body">
                    ${bodyContent}
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
        return null;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    return printWindow;
};

// NEW: Helper to convert an SVG in a container to a PNG data URL
const convertChartToPng = (chartContainerRef: React.RefObject<HTMLDivElement>): Promise<string> => {
    return new Promise((resolve, reject) => {
        // A small delay to allow chart animations to complete before capturing
        setTimeout(() => {
            if (!chartContainerRef.current) {
                return reject(new Error('لم يتم العثور على حاوية الرسم البياني.'));
            }
            const svgEl = chartContainerRef.current.querySelector('svg');
            if (!svgEl) {
                return reject(new Error('لم يتم العثور على الرسم البياني للطباعة.'));
            }

            try {
                const container = chartContainerRef.current!;
                const { width, height } = container.getBoundingClientRect();

                if (!width || !height) {
                    return reject(new Error('لا يمكن تحديد أبعاد الرسم البياني للطباعة.'));
                }

                const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
                svgClone.setAttribute('width', String(width));
                svgClone.setAttribute('height', String(height));
                
                const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                backgroundRect.setAttribute('width', '100%');
                backgroundRect.setAttribute('height', '100%');
                backgroundRect.setAttribute('fill', 'white');
                svgClone.insertBefore(backgroundRect, svgClone.firstChild);

                const svgData = new XMLSerializer().serializeToString(svgClone);
                const svgBase64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                
                const img = new Image();
                img.onload = () => {
                    const scale = 2; // Higher resolution for print quality
                    const canvas = document.createElement('canvas');
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error('فشل في الحصول على سياق الرسم.'));
                    }
                    
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => {
                    reject(new Error('فشل تحميل صورة الرسم البياني للطباعة.'));
                };
                img.src = svgBase64;
            } catch (e) {
                console.error("Chart conversion error:", e);
                reject(new Error('حدث خطأ أثناء إعداد الرسم البياني للطباعة.'));
            }
        }, 300); // 300ms timeout for animations
    });
};


// UPDATED printChart function
export const printChart = async (chartContainerRef: React.RefObject<HTMLDivElement>, title: string, filters: PrintFilters) => {
    try {
        const pngFile = await convertChartToPng(chartContainerRef);
        const customStyles = `
            .print-body { text-align: center; }
            img {
                max-width: 18cm; /* A4 width minus margins */
                height: auto;
                border: 1px solid #ccc;
                padding: 5px;
                margin-top: 20px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
        `;
        const subtitle = createFilterSubtitle(filters);
        const bodyContent = `<img src="${pngFile}" alt="${title}" />`;
        const printWin = generatePrintWindow(title, subtitle, bodyContent, customStyles);
        
        if (printWin) {
            printWin.onload = () => {
                printWin.print();
                printWin.close();
            };
        }
    } catch (error: any) {
        console.error("Chart printing error:", error);
        alert(`حدث خطأ أثناء طباعة الرسم البياني: ${error.message}`);
    }
};

// NEW function to print all charts together
export const printAllCharts = async (
    charts: { ref: React.RefObject<HTMLDivElement>; title: string }[],
    filters: PrintFilters
) => {
    try {
        const visibleCharts = charts.filter(chart => chart.ref.current);

        if (visibleCharts.length === 0) {
            alert('لا توجد رسوم بيانية ظاهرة لطباعتها. يرجى فتح الأقسام التي تحتوي على الرسوم البيانية أولاً.');
            return;
        }

        const chartImagePromises = visibleCharts.map(chart => 
            convertChartToPng(chart.ref).then(imageData => ({
                title: chart.title,
                imageData,
            }))
        );

        const chartImages = await Promise.all(chartImagePromises);

        let bodyContent = chartImages.map(chart => `
            <div class="chart-container">
                <h3>${chart.title}</h3>
                <img src="${chart.imageData}" alt="${chart.title}" />
            </div>
        `).join('');

        const customStyles = `
            .print-body { text-align: center; }
            .chart-container {
                page-break-inside: avoid;
                margin-bottom: 2cm;
            }
            .chart-container:last-child {
                margin-bottom: 0;
            }
            h3 {
                font-size: 14pt;
                color: #333;
                margin-bottom: 10px;
            }
            img {
                max-width: 18cm;
                height: auto;
                border: 1px solid #ccc;
                padding: 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
        `;
        const subtitle = createFilterSubtitle(filters);
        const printWin = generatePrintWindow('ملخص الرسوم البيانية', subtitle, bodyContent, customStyles);

        if (printWin) {
            printWin.onload = () => {
                printWin.print();
                printWin.close();
            };
        }
    } catch (error: any) {
        console.error("All charts printing error:", error);
        alert(`حدث خطأ أثناء طباعة الرسوم البيانية: ${error.message}`);
    }
};

// printTable function
export const printTable = (tableContainerRef: React.RefObject<HTMLDivElement>, title: string, filters: PrintFilters) => {
    if (!tableContainerRef.current) {
        alert('لم يتم العثور على حاوية الجدول.');
        return;
    }
    const tableEl = tableContainerRef.current.querySelector('table');
    if (!tableEl) {
        alert('لم يتم العثور على الجدول للطباعة.');
        return;
    }

    const customStyles = `
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt; /* Smaller font for print */
            page-break-inside: auto;
        }
        thead {
            display: table-header-group; /* Ensure header repeats on each page */
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
        .underutilized { /* Specific class from UtilizationSection */
            background-color: #fee2e2 !important;
        }
    `;
    const subtitle = createFilterSubtitle(filters);
    const bodyContent = tableEl.outerHTML;
    const printWin = generatePrintWindow(title, subtitle, bodyContent, customStyles);
    
    if (printWin) {
        setTimeout(() => {
            printWin.print();
            printWin.close();
        }, 250);
    }
};

// function to print AI reports
export const printAiReport = (reportContent: string, title: string, filters: PrintFilters) => {
    const cleanedReport = reportContent.trim();
    const bodyContent = `<pre class="ai-report-content">${cleanedReport}</pre>`;

    const customStyles = `
        .ai-report-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Cairo', sans-serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #1e293b;
        }
    `;

    const subtitle = createFilterSubtitle(filters);
    const printWin = generatePrintWindow(title, subtitle, bodyContent, customStyles);
    
    if (printWin) {
        setTimeout(() => {
            printWin.print();
            printWin.close();
        }, 250);
    }
};