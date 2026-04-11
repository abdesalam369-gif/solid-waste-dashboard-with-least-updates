
import React, { useState, useMemo, useRef } from 'react';
import { AreaPopulationStats } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
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

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Population_Analysis`);
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-sm">
                <div className="w-full sm:w-auto flex items-center gap-3">
                    <label htmlFor="popSort" className="font-black text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('chart_grouping')}</label>
                    <select id="popSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof AreaPopulationStats)}
                        className="p-2.5 sm:p-3 w-full sm:w-auto border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs sm:text-sm">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-auto flex justify-end">
                    <ExportDropdown 
                        onExportPdf={handlePrint}
                        onExportExcel={handleExportExcel}
                        onExportCsv={handleExportExcel}
                        onExportImage={() => exportToImage(tableContainerRef, `Population_Export`)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto rounded-3xl md:rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-[10px] md:text-[11px] text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map((row, idx) => (
                            <tr key={`${row.area}-${idx}`} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{areaMapping[row.area] || row.area}</td>
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.population)}</td>
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.served)}</td>
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(row.coverageRate, 1)}%</td>
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.totalTons, 1)}</td>
                                <td className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">
                                    {formatNumber(row.kgPerCapita, 3)}
                                </td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100">
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700">{t('total_avg')}</td>
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalPop)}</td>
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalServed)}</td>
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">{formatNumber(totals.totalCoverage, 1)}%</td>
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700">{formatNumber(totals.totalTons, 1)}</td>
                                <td className="p-3 md:p-4 border-t-2 border-slate-300 dark:border-slate-700 text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30">
                                    {formatNumber(totals.avgKg, 3)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-[10px] sm:text-xs font-bold text-indigo-800 dark:text-indigo-300 leading-relaxed transition-colors flex items-start gap-2 sm:gap-3">
                <span className="text-base sm:text-lg">💡</span>
                <div>
                    <strong className="block mb-1 text-indigo-900 dark:text-indigo-200">{t('print_note')}</strong> 
                    {t('pop_analysis_note')}
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default PopulationAnalysisSection;
