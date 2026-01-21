
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

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
    const { t, language, setLanguage } = useLanguage();
    
    const vehicles = useMemo(() => [...new Set(tripsData.map(r => r['رقم المركبة']).filter(Boolean))].sort(), [tripsData]);
    const months = useMemo(() => [...new Set(tripsData.map(r => (r['الشهر'] || '').toLowerCase()).filter(Boolean))], [tripsData]);
    const years = useMemo(() => [...new Set(tripsData.map(r => r['السنة']).filter(Boolean))].sort().reverse(), [tripsData]);

    const printKPIs = () => {
        const kpiGrid = document.getElementById('kpi-grid');
        if (kpiGrid) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (!printWindow) {
                alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.');
                return;
            }

            const today = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // الحصول على كافة الأقسام
            const sections = kpiGrid.querySelectorAll('div.space-y-6');
            let fullHtml = '';

            sections.forEach(section => {
                const titleNode = section.querySelector('h3');
                const title = titleNode?.textContent || '';
                const cardNodes = section.querySelectorAll('div.group');

                let sectionCardsHtml = '';
                cardNodes.forEach(card => {
                    // استخراج الأيقونة
                    const iconSpan = card.querySelector('span.text-3xl');
                    const icon = iconSpan?.textContent || '';

                    // استخراج القيمة (تحمل كلاسات الألوان)
                    const valueNode = card.querySelector('div.text-2xl.font-black');
                    const value = valueNode?.textContent || '';
                    const colorClass = Array.from(valueNode?.classList || []).find(c => c.startsWith('text-')) || 'text-slate-800';

                    // استخراج التسمية
                    const labelNode = card.querySelector('div.text-\\[11px\\]');
                    const label = labelNode?.textContent || '';

                    // استخراج المقارنة إن وجدت
                    const compNode = card.querySelector('div.text-\\[10px\\] span.text-slate-600');
                    const compValue = compNode?.textContent || '';

                    sectionCardsHtml += `
                        <div class="kpi-card">
                            <div class="kpi-icon">${icon}</div>
                            <div class="kpi-value ${colorClass}">${value}</div>
                            <div class="kpi-label">${label}</div>
                            ${compValue ? `<div class="kpi-comparison">${t('comparison')}: ${compValue}</div>` : ''}
                        </div>
                    `;
                });

                fullHtml += `
                    <div class="print-section">
                        <h2 class="section-title">${title}</h2>
                        <div class="kpi-grid-container">
                            ${sectionCardsHtml}
                        </div>
                    </div>
                `;
            });

            const printContent = `
                <html>
                <head>
                    <title>${t('print_kpis')} - ${selectedYear}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Cairo', sans-serif;
                            direction: ${language === 'ar' ? 'rtl' : 'ltr'};
                            margin: 30px;
                            background-color: #fff;
                            color: #1e293b;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 40px;
                            border-bottom: 3px double #334155;
                            padding-bottom: 20px;
                        }
                        .print-header h1 {
                            font-size: 26px;
                            margin: 0;
                            color: #1e3a8a;
                        }
                        .print-header p {
                            font-size: 16px;
                            margin: 10px 0 0;
                            color: #64748b;
                        }
                        .print-section {
                            margin-bottom: 40px;
                            page-break-inside: avoid;
                        }
                        .section-title {
                            font-size: 20px;
                            font-weight: 700;
                            color: #1e293b;
                            border-${language === 'ar' ? 'right' : 'left'}: 5px solid #2563eb;
                            padding-${language === 'ar' ? 'right' : 'left'}: 15px;
                            margin-bottom: 20px;
                            background: #f8fafc;
                            padding-top: 5px;
                            padding-bottom: 5px;
                        }
                        .kpi-grid-container {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        .kpi-card {
                            border: 1px solid #e2e8f0;
                            border-radius: 15px;
                            padding: 20px;
                            text-align: center;
                            background-color: #ffffff;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                        }
                        .kpi-icon {
                            font-size: 24px;
                            margin-bottom: 10px;
                        }
                        .kpi-value {
                            font-size: 26px;
                            font-weight: 800;
                            margin-bottom: 5px;
                        }
                        .kpi-label {
                            font-size: 13px;
                            font-weight: 700;
                            color: #64748b;
                            text-transform: uppercase;
                        }
                        .kpi-comparison {
                            font-size: 10px;
                            color: #94a3b8;
                            margin-top: 10px;
                            border-top: 1px solid #f1f5f9;
                            padding-top: 5px;
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
                        .text-emerald-800 { color: #064e3b; }
                        .text-cyan-600 { color: #0891b2; }
                        .text-rose-500 { color: #f43f5e; }
                        .text-slate-700 { color: #334155; }
                        .text-slate-800 { color: #1e293b; }
                        .text-indigo-500 { color: #6366f1; }
                        .text-amber-600 { color: #d97706; }
                        .text-blue-700 { color: #1d4ed8; }
                        .text-teal-600 { color: #0d9488; }
                        .text-orange-600 { color: #ea580c; }
                        .text-emerald-700 { color: #047857; }

                        @media print {
                            body { margin: 20px; }
                            .kpi-grid-container { grid-template-columns: repeat(3, 1fr); }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>${t('app_title')} - ${t('year')} ${selectedYear}</h1>
                        <p>${t('municipality_name')} | ${today}</p>
                    </div>
                    ${fullHtml}
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

    const toggleLanguage = () => {
        setLanguage(language === 'ar' ? 'en' : 'ar');
    };

    return (
        <header className="bg-gradient-to-l from-blue-600 to-sky-500 text-white p-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-right">
                <h1 className="text-xl md:text-2xl font-bold leading-tight">{t('app_title')}</h1>
                <h2 className="text-lg md:text-xl font-semibold">{t('municipality_name')}</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                    onClick={toggleLanguage}
                    className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition flex items-center gap-2 border border-white/10"
                >
                    {language === 'ar' ? 'English 🇺🇸' : 'العربية 🇯🇴'}
                </button>
                <FilterDropdown
                    buttonText={t('year')}
                    items={years}
                    selectedItems={selectedYear}
                    onToggle={onYearChange}
                    isSingle={true}
                    activeColor="bg-blue-800"
                />
                <FilterDropdown
                    buttonText={t('compare_with')}
                    items={years}
                    selectedItems={comparisonYear}
                    onToggle={onComparisonYearChange}
                    isSingle={true}
                    activeColor="bg-slate-700"
                />
                <div className="w-px h-8 bg-white/30 mx-2 hidden md:block"></div>
                <FilterDropdown
                    buttonText={t('vehicles')}
                    items={vehicles}
                    selectedItems={filters.vehicles}
                    onToggle={(item) => onFilterToggle('vehicles', item)}
                />
                <FilterDropdown
                    buttonText={t('months')}
                    items={months}
                    selectedItems={filters.months}
                    onToggle={(item) => onFilterToggle('months', item.toLowerCase())}
                />
                <button
                    onClick={onResetFilters}
                    className="px-3 py-2 border-none rounded-lg bg-red-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-red-600"
                >
                    {t('reset')}
                </button>
                <button
                    onClick={printKPIs}
                    className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600"
                >
                    {t('print_kpis')}
                </button>
            </div>
        </header>
    );
};

export default Header;
