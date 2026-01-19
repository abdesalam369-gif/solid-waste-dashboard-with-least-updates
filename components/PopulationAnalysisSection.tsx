
import React, { useState, useMemo, useRef } from 'react';
import { AreaPopulationStats } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';

interface PopulationAnalysisSectionProps {
    tableData: AreaPopulationStats[];
    filters: { vehicles: Set<string>; months: Set<string> };
}

const PopulationAnalysisSection: React.FC<PopulationAnalysisSectionProps> = ({ tableData, filters }) => {
    const [sortBy, setSortBy] = useState<keyof AreaPopulationStats>('kgPerCapita');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const sortedData = useMemo(() => {
        const sorted = [...tableData];
        sorted.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB, 'ar');
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return valB - valA;
            }
            return 0;
        });
        return sorted;
    }, [tableData, sortBy]);

    const totals = useMemo(() => {
        if (sortedData.length === 0) return null;
        const totalPop = sortedData.reduce((sum, row) => sum + row.population, 0);
        const totalTons = sortedData.reduce((sum, row) => sum + row.totalTons, 0);
        const avgKg = totalPop > 0 ? (totalTons * 1000) / totalPop : 0;
        return { totalPop, totalTons, avgKg };
    }, [sortedData]);

    const handlePrint = () => {
        printTable(tableContainerRef, 'تحليل كثافة النفايات حسب التعداد السكاني', filters);
    };

    const headers = [
        { key: 'area', label: 'المنطقة' },
        { key: 'population', label: 'عدد السكان' },
        { key: 'totalTons', label: 'إجمالي الأوزان (طن)' },
        { key: 'kgPerCapita', label: 'نصيب الفرد من النفايات (كغم/فرد)' },
    ];

    if (tableData.length === 0) return null;

    return (
        <CollapsibleSection title="تحليل التعداد السكاني والخدمة">
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="popSort" className="ml-2 font-semibold">ترتيب حسب:</label>
                    <select id="popSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof AreaPopulationStats)}
                        className="p-2 border border-slate-300 rounded-lg">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    طباعة الجدول
                </button>
            </div>
            <div className="overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-100">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 font-semibold text-slate-600">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => (
                            <tr key={`${row.area}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 border-b border-slate-200 font-bold">{row.area}</td>
                                <td className="p-3 border-b border-slate-200">{formatNumber(row.population)}</td>
                                <td className="p-3 border-b border-slate-200">{formatNumber(row.totalTons, 1)}</td>
                                <td className="p-3 border-b border-slate-200 font-semibold text-indigo-600">
                                    {formatNumber(row.kgPerCapita, 3)}
                                </td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="bg-slate-200 font-black text-slate-800">
                                <td className="p-3 border-t-2 border-slate-300">المجموع / المتوسط</td>
                                <td className="p-3 border-t-2 border-slate-300">{formatNumber(totals.totalPop)}</td>
                                <td className="p-3 border-t-2 border-slate-300">{formatNumber(totals.totalTons, 1)}</td>
                                <td className="p-3 border-t-2 border-slate-300 text-indigo-800">
                                    {formatNumber(totals.avgKg, 3)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 leading-relaxed">
                <strong>ملاحظة:</strong> يتم حساب نصيب الفرد بقسمة إجمالي الأوزان (بعد تحويلها إلى كيلوغرامات) التي جمعها أسطول البلدية في المنطقة على عدد سكان تلك المنطقة. هذا المؤشر يساعد في تحديد المناطق ذات الضغط العالي والحاجة لزيادة الموارد.
            </div>
        </CollapsibleSection>
    );
};

export default PopulationAnalysisSection;
