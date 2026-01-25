
import React, { useState, useMemo, useRef } from 'react';
import { DriverStatsData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';

interface DriverStatsSectionProps {
    tableData: DriverStatsData[];
    filters: { vehicles: Set<string>; months: Set<string> };
}

const DriverStatsSection: React.FC<DriverStatsSectionProps> = ({ tableData, filters }) => {
    const { t, language } = useLanguage();
    const [sortBy, setSortBy] = useState<keyof DriverStatsData>('tons');
    const tableContainerRef = useRef<HTMLDivElement>(null);

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

    const topThree = useMemo(() => {
        return [...tableData]
            .sort((a, b) => b.tons - a.tons)
            .slice(0, 3);
    }, [tableData]);

    const handlePrint = () => {
        printTable(tableContainerRef, t('sec_driver_perf'), filters, t, language);
    };

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Drivers_Performance`);
    };

    const headers = [
        { key: 'driver', label: t('th_driver') },
        { key: 'trips', label: t('th_trips') },
        { key: 'tons', label: t('th_tons') },
        { key: 'avgTonsPerTrip', label: t('th_avg_load') },
        { key: 'vehicles', label: t('th_vehicles_used') },
    ];

    if (tableData.length === 0) return (
        <CollapsibleSection title={t('sec_driver_perf')}>
            <div className="p-12 text-center text-slate-400">لا توجد بيانات متاحة لهؤلاء السائقين في الفترة المختارة.</div>
        </CollapsibleSection>
    );

    return (
        <CollapsibleSection title={t('sec_driver_perf')}>
            {/* Top Performers Recognition */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {topThree.map((driver, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:-translate-y-2 transition-all">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-10 -mt-10 rounded-full opacity-10 ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">السائق الأكثر إنتاجية</div>
                                <div className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">{driver.driver}</div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-between items-end relative z-10">
                            <div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatNumber(driver.tons, 1)}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase">{t('unit_ton')} إجمالي</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400">{driver.trips}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase">رحلة منقولة</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-sm">
                <div className="flex items-center gap-3">
                    <label htmlFor="driverSort" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('chart_grouping')}</label>
                    <select id="driverSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof DriverStatsData)}
                        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-2 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100 shadow-sm">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <ExportDropdown 
                    onExportPdf={handlePrint}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Drivers_Performance`)}
                />
            </div>

            <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm" ref={tableContainerRef}>
                <table id="driver-stats-table" className="w-full text-[11px] text-center border-collapse bg-white dark:bg-slate-900 transition-colors">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            {headers.map(h => (
                                <th key={h.key} className="p-5 border-b border-slate-200 dark:border-slate-700 font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-all duration-200 group">
                                <td className="p-4 font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">{row.driver}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-400 font-bold">{formatNumber(row.trips)}</td>
                                <td className="p-4 text-slate-800 dark:text-slate-200 font-black text-sm">{formatNumber(row.tons, 1)}</td>
                                <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold">{formatNumber(row.avgTonsPerTrip, 1)}</td>
                                <td className="p-4">
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {row.vehicles.split(',').map((v, i) => (
                                            <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{v.trim()}</span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default DriverStatsSection;
