
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip } from '../types';

interface HeaderProps {
    tripsData: Trip[];
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
    comparisonYear: string;
    onYearChange: (year: string) => void;
    onComparisonYearChange: (year: string) => void;
    onFilterToggle: (type: 'vehicles' | 'months', value: string) => void;
    onResetFilters: () => void;
}

const FilterDropdown: React.FC<{
    buttonText: string;
    items: string[];
    selectedItems: Set<string> | string;
    onToggle: (item: string) => void;
    isSingle?: boolean;
    activeColor?: string;
}> = ({ buttonText, items, selectedItems, onToggle, isSingle = false, activeColor = 'bg-blue-700' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isSelected = (item: string) => {
        if (isSingle) return selectedItems === item;
        return (selectedItems as Set<string>).has(item);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-4 py-2 border-none rounded-lg text-sm font-semibold cursor-pointer shadow-md transition hover:opacity-90 ${isSingle && selectedItems ? `${activeColor} text-white` : 'bg-white text-slate-800'}`}
            >
                {buttonText} {isSingle && selectedItems ? `: ${selectedItems}` : '▼'}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto p-2">
                    {items.map(item => (
                        <label key={item} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                            <input
                                type={isSingle ? "radio" : "checkbox"}
                                name={isSingle ? "single-select" : undefined}
                                value={item}
                                checked={isSelected(item)}
                                onChange={() => {
                                    onToggle(item);
                                    if (isSingle) setIsOpen(false);
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">{item}</span>
                        </label>
                    ))}
                    {isSingle && selectedItems && (
                        <button 
                            onClick={() => { onToggle(''); setIsOpen(false); }}
                            className="w-full text-center p-2 text-xs text-red-500 hover:bg-red-50"
                        >
                            إلغاء التحديد
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ tripsData, filters, selectedYear, comparisonYear, onYearChange, onComparisonYearChange, onFilterToggle, onResetFilters }) => {
    const vehicles = useMemo(() => [...new Set(tripsData.map(r => r['رقم المركبة']).filter(Boolean))].sort(), [tripsData]);
    const months = useMemo(() => [...new Set(tripsData.map(r => (r['الشهر'] || '').toLowerCase()).filter(Boolean))], [tripsData]);
    const years = useMemo(() => [...new Set(tripsData.map(r => r['السنة']).filter(Boolean))].sort().reverse(), [tripsData]);

    const printKPIs = () => {
        const kpiElement = document.getElementById('kpi-grid');
        if (kpiElement) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (!printWindow) {
                alert('Please allow popups to print the report.');
                return;
            }

            const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const kpiCardNodes = Array.from(kpiElement.children);
            let cardsHtml = '';
            kpiCardNodes.forEach(cardNode => {
                const valueNode = cardNode.querySelector('div:first-child');
                const labelNode = cardNode.querySelector('div:last-child');
                const iconNode = labelNode?.querySelector('span');
    
                const value = valueNode?.textContent || '';
                const icon = iconNode?.textContent || '';
                
                let label = '';
                if (labelNode) {
                    const labelClone = labelNode.cloneNode(true) as HTMLElement;
                    const iconClone = labelClone.querySelector('span');
                    if (iconClone) {
                        labelClone.removeChild(iconClone);
                    }
                    label = labelClone.textContent?.trim() || '';
                }
    
                const colorClass = valueNode?.className.split(' ').find(c => c.startsWith('text-')) || 'text-slate-800';
    
                cardsHtml += `
                    <div class="kpi-card">
                        <div class="kpi-value ${colorClass}">${value}</div>
                        <div class="kpi-label">
                            <span>${icon}</span>
                            ${label}
                        </div>
                    </div>
                `;
            });
    
            const printContent = `
                <html>
                <head>
                    <title>طباعة مؤشرات الأداء الرئيسية - ${selectedYear}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Cairo', sans-serif;
                            direction: rtl;
                            margin: 20px;
                            background-color: #fff;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 25px;
                            border-bottom: 2px solid #333;
                            padding-bottom: 15px;
                        }
                        .print-header h1 {
                            font-size: 24px;
                            margin: 0;
                            color: #1e3a8a;
                        }
                        .print-header h2 {
                            font-size: 18px;
                            margin: 5px 0 0;
                            color: #4b5563;
                        }
                        .kpi-grid-container {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 20px;
                            padding: 10px;
                        }
                        .kpi-card {
                            border: 1px solid #e5e7eb;
                            border-radius: 12px;
                            padding: 16px;
                            text-align: center;
                            background-color: #f9fafb;
                            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                            page-break-inside: avoid;
                        }
                        .kpi-value {
                            font-size: 28px;
                            font-weight: 700;
                            margin-bottom: 8px;
                        }
                        .kpi-label {
                            font-size: 14px;
                            font-weight: 600;
                            color: #374151;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        }
                        .kpi-label span {
                            font-size: 18px;
                        }
                        .text-blue-600 { color: #2563eb; }
                        .text-sky-500 { color: #0ea5e9; }
                        .text-orange-500 { color: #f97316; }
                        .text-red-600 { color: #dc2626; }
                        .text-green-600 { color: #16a34a; }
                        .text-pink-600 { color: #db2777; }
                        .text-purple-600 { color: #9333ea; }
                        .text-indigo-600 { color: #4f46e5; }
                        .text-teal-500 { color: #14b8a6; }
                        .text-amber-500 { color: #f59e0b; }
                        .text-slate-800 { color: #1e293b; }
    
                        @media print {
                            body { margin: 0; }
                            .print-header { margin: 20px; }
                            .kpi-grid-container { grid-template-columns: repeat(3, 1fr); margin: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>مؤشرات الأداء لأسطول إدارة النفايات - سنة ${selectedYear}</h1>
                        <h2>بلدية مؤتة والمزار - ${today}</h2>
                    </div>
                    <div class="kpi-grid-container">
                        ${cardsHtml}
                    </div>
                </body>
                </html>
            `;
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    return (
        <header className="bg-gradient-to-l from-blue-600 to-sky-500 text-white p-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold leading-tight">لوحة مؤشرات الأداء لإدارة النفايات الصلبة</h1>
                <h2 className="text-lg md:text-xl font-semibold">بلدية مؤتة والمزار</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <FilterDropdown
                    buttonText="السنة"
                    items={years}
                    selectedItems={selectedYear}
                    onToggle={onYearChange}
                    isSingle={true}
                    activeColor="bg-blue-800"
                />
                <FilterDropdown
                    buttonText="مقارنة مع"
                    items={years}
                    selectedItems={comparisonYear}
                    onToggle={onComparisonYearChange}
                    isSingle={true}
                    activeColor="bg-slate-700"
                />
                <div className="w-px h-8 bg-white/30 mx-2 hidden md:block"></div>
                <FilterDropdown
                    buttonText="المركبات"
                    items={vehicles}
                    selectedItems={filters.vehicles}
                    onToggle={(item) => onFilterToggle('vehicles', item)}
                />
                <FilterDropdown
                    buttonText="الأشهر"
                    items={months}
                    selectedItems={filters.months}
                    onToggle={(item) => onFilterToggle('months', item.toLowerCase())}
                />
                <button
                    onClick={onResetFilters}
                    className="px-3 py-2 border-none rounded-lg bg-red-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-red-600"
                >
                    إعادة تعيين
                </button>
                <button
                    onClick={printKPIs}
                    className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600"
                >
                    طباعة المؤشرات
                </button>
            </div>
        </header>
    );
};

export default Header;
