
import React, { useState, useMemo, useRef } from 'react';
import { AreaPopulationStats } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';

interface PopulationAnalysisSectionProps {
    tableData: AreaPopulationStats[];
    filters: { vehicles: Set<string>; months: Set<string> };
}

const PopulationAnalysisSection: React.FC<PopulationAnalysisSectionProps> = ({ tableData, filters }) => {
    const { t, language } = useLanguage();
    const [sortBy, setSortBy] = useState<keyof AreaPopulationStats>('kgPerCapita');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const areaMapping: {[key: string]: string} = {
        'الطيبة': t('area_taybeh'),
        'مؤته': t('area_mutah'),
        'مؤتة': t('area_mutah'),
        'المزار': t('area_mazar'),
        'العراق': t('area_iraq'),
        'الهاشمية': t('area_hashimiah'),
        'سول': t('area_sol'),
        'جعفر': t('area_jaffar'),
        'غير محدد': t('area_undefined')
    };

    const sortedData = useMemo(() => {
        const sorted = [...tableData];
        sorted.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB, language);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return valB - valA;
            }
            return 0;
        });
        return sorted;
    }, [tableData, sortBy, language]);

    const totals = useMemo(() => {
        if (sortedData.length === 0) return null;
        const totalPop = sortedData.reduce((sum, row) => sum + row.population, 0);
        const totalServed = sortedData.reduce((sum, row) => sum + row.served, 0);
        const totalTons = sortedData.reduce((sum, row) => sum + row.totalTons, 0);
        const avgKg = totalPop > 0 ? (totalTons * 1000) / totalPop : 0;
        const totalCoverage = totalPop > 0 ? (totalServed / totalPop) * 100 : 0;
        return { totalPop, totalServed, totalTons, avgKg, totalCoverage };
    }, [sortedData]);

    const handlePrint = () => {
        printTable(tableContainerRef, t('sec_pop_analysis'), filters, t, language);
    };

    const headers = [
        { key: 'area', label: t('th_area') },
        { key: 'population', label: t('th_pop') },
        { key: 'served', label: t('th_served_pop') },
        { key: 'coverageRate', label: t('th_coverage') },
        { key: 'totalTons', label: t('th_tons') },
        { key: 'kgPerCapita', label: t('th_kg_capita') },
    ];

    if (tableData.length === 0) return null;

    return (
        <CollapsibleSection title={t('sec_pop_analysis')}>
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="popSort" className="ml-2 font-semibold text-slate-700 dark:text-slate-300">{t('chart_grouping')}</label>
                    <select id="popSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof AreaPopulationStats)}
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    {t('print')}
                </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map((row, idx) => (
                            <tr key={`${row.area}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{areaMapping[row.area] || row.area}</td>
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.population)}</td>
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.served)}</td>
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(row.coverageRate, 1)}%</td>
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.totalTons, 1)}</td>
                                <td className="p-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-indigo-600 dark:text-indigo-400">
                                    {formatNumber(row.kgPerCapita, 3)}
                                </td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="bg-slate-200 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100">
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700">{t('total_avg')}</td>
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalPop)}</td>
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalServed)}</td>
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700 text-emerald-800 dark:text-emerald-300">{formatNumber(totals.totalCoverage, 1)}%</td>
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalTons, 1)}</td>
                                <td className="p-3 border-t-2 border-slate-300 dark:border-slate-700 text-indigo-800 dark:text-indigo-300">
                                    {formatNumber(totals.avgKg, 3)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed transition-colors">
                <strong>{t('print_note')}</strong> {t('pop_analysis_note')}
            </div>
        </CollapsibleSection>
    );
};

export default PopulationAnalysisSection;
