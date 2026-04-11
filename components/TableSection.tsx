
import React, { useState, useMemo, useRef } from 'react';
import { VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';

interface TableSectionProps {
    tableData: VehicleTableData[];
    filters: { vehicles: Set<string>; months: Set<string> };
    title?: string;
}

const TableSection: React.FC<TableSectionProps> = ({ tableData, filters, title }) => {
    const { t, language } = useLanguage();
    const [sortBy, setSortBy] = useState<keyof VehicleTableData | 'utilization'>('tons');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const headers = [
        { key: 'veh', label: t('th_veh_no') }, 
        { key: 'area', label: t('th_area') },
        { key: 'year', label: t('th_year') },
        { key: 'cap_ton', label: t('th_cap_ton') },
        { key: 'trips', label: t('th_trips') }, 
        { key: 'tons', label: t('th_tons') },
        { key: 'avg_load', label: t('th_avg_load') },
        { key: 'utilization', label: t('th_utilization') },
        { key: 'fuelLiters', label: t('th_fuel_liters') },
        { key: 'liters_per_ton', label: t('th_liters_ton') },
        { key: 'fuel', label: t('th_fuel') }, 
        { key: 'maint', label: t('th_maint') },
        { key: 'cost_ton', label: t('th_cost_ton') },
        { key: 'distance', label: t('th_distance') }, 
    ];

    const enrichedData = useMemo(() => {
        return tableData.map(v => {
            const avgLoad = v.trips > 0 ? v.tons / v.trips : 0;
            const utilization = v.cap_ton > 0 ? (avgLoad / v.cap_ton) * 100 : 0;
            return { ...v, avgLoad, utilization };
        });
    }, [tableData]);

    const sortedData = useMemo(() => {
        const sorted = [...enrichedData];
        sorted.sort((a: any, b: any) => {
            const valA = a[sortBy]; const valB = b[sortBy];
            if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB, language);
            if (typeof valA === 'number' && typeof valB === 'number') return valB - valA;
            return 0;
        });
        return sorted;
    }, [enrichedData, sortBy, language]);
    
    const totals = useMemo(() => {
        if (sortedData.length === 0) return null;
        
        const totalTrips = sortedData.reduce((s, r) => s + r.trips, 0);
        const totalTons = sortedData.reduce((s, r) => s + r.tons, 0);
        const totalFuel = sortedData.reduce((s, r) => s + r.fuel, 0);
        const totalFuelLiters = sortedData.reduce((s, r) => s + r.fuelLiters, 0);
        const totalMaint = sortedData.reduce((s, r) => s + r.maint, 0);
        const totalDistance = sortedData.reduce((s, r) => s + r.distance, 0);
        
        const totalCost = totalFuel + totalMaint;
        const avgUtilization = sortedData.reduce((s, r) => s + r.utilization, 0) / sortedData.length;
        const avgLitersTon = totalTons > 0 ? totalFuelLiters / totalTons : 0;
        
        return { 
            totalTrips, 
            totalTons, 
            totalFuel, 
            totalFuelLiters,
            totalMaint, 
            totalDistance,
            avgUtilization,
            avgCostTon: totalTons > 0 ? totalCost / totalTons : 0,
            avgLitersTon
        };
    }, [sortedData]);

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Fleet_Efficiency_Consolidated`);
    };

    return (
        <CollapsibleSection title={title || t('sec_veh_eff')}>
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-sm">
                <div className="w-full sm:w-auto">
                    <label className="ml-2 font-black text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest">{t('chart_grouping')}</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                        className="p-2.5 w-full sm:w-auto border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-auto flex justify-end">
                    <ExportDropdown 
                        onExportPdf={() => printTable(tableContainerRef, title || t('sec_veh_eff'), filters, t, language)}
                        onExportExcel={handleExportExcel}
                        onExportCsv={handleExportExcel}
                        onExportImage={() => exportToImage(tableContainerRef, `Efficiency_Table`)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-[11px] text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr>
                            {headers.map(h => (
                                <th key={h.key} className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map(row => (
                            <tr key={row.veh} className={`hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors ${row.utilization < 50 ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}`}>
                                <td className="p-3 font-black text-slate-800 dark:text-slate-200">{row.veh}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 font-bold">{row.area}</td>
                                <td className="p-3 text-slate-500 dark:text-slate-500">{row.year}</td>
                                <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(row.cap_ton, 1)}</td>
                                <td className="p-3 text-slate-500 dark:text-slate-500">{formatNumber(row.trips)}</td>
                                <td className="p-3 text-slate-800 dark:text-slate-200 font-black">{formatNumber(row.tons, 1)}</td>
                                <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold">{formatNumber(row.avgLoad, 1)}</td>
                                <td className={`p-3 font-black ${row.utilization < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    <div className="flex items-center justify-center gap-1">
                                        {formatNumber(row.utilization, 0)}%
                                        {row.utilization < 50 && <span title="Underutilized">⚠️</span>}
                                    </div>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(row.fuelLiters, 0)}</td>
                                <td className="p-3 text-orange-600 font-black">{formatNumber(row.liters_per_ton, 1)}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(row.fuel, 0)}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(row.maint, 0)}</td>
                                <td className="p-3 font-black text-blue-700 dark:text-blue-400 bg-slate-50/50 dark:bg-slate-800/30">{formatNumber(row.cost_ton, 1)}</td>
                                <td className="p-3 text-slate-500 dark:text-slate-500">{formatNumber(row.distance, 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {totals && (
                        <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700">
                            <tr>
                                <td className="p-4" colSpan={4}>المتوسط العام للأسطول</td>
                                <td className="p-4">{formatNumber(totals.totalTrips)}</td>
                                <td className="p-4">{formatNumber(totals.totalTons, 0)}</td>
                                <td className="p-4 text-indigo-700 dark:text-indigo-300">—</td>
                                <td className={`p-4 ${totals.avgUtilization < 60 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatNumber(totals.avgUtilization, 1)}%</td>
                                <td className="p-4">{formatNumber(totals.totalFuelLiters, 0)}</td>
                                <td className="p-4 text-orange-700">{formatNumber(totals.avgLitersTon, 1)}</td>
                                <td className="p-4">{formatNumber(totals.totalFuel, 0)}</td>
                                <td className="p-4">{formatNumber(totals.totalMaint, 0)}</td>
                                <td className="p-4 text-blue-700 dark:text-blue-300">{formatNumber(totals.avgCostTon, 1)}</td>
                                <td className="p-4 font-black">{formatNumber(totals.totalDistance, 0)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-[10px] text-rose-700 dark:text-rose-300 flex items-center gap-3">
                <span className="text-lg">💡</span>
                <p className="font-bold">تلميح: الصفوف المظللة باللون الأحمر تمثل ضاغطات تعمل بأقل من 50% من طاقتها الاستيعابية الفعلية، مما يستدعي مراجعة مسارات الجمع الخاصة بها.</p>
            </div>
        </CollapsibleSection>
    );
};

export default TableSection;
