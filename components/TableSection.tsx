
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
    const [sortBy, setSortBy] = useState<keyof VehicleTableData>('tons');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const headers = [
        { key: 'veh', label: t('th_veh_no') }, 
        { key: 'area', label: t('th_area') },
        { key: 'drivers', label: t('th_driver') }, 
        { key: 'year', label: t('th_year') },
        { key: 'cap_m3', label: t('th_cap_m3') }, 
        { key: 'cap_ton', label: t('th_cap_ton') },
        { key: 'actual_daily_cap', label: t('th_actual_daily_cap'), description: t('th_actual_daily_cap_desc') },
        { key: 'trips', label: t('th_trips') }, 
        { key: 'tons', label: t('th_tons') },
        { key: 'fuel', label: t('th_fuel') }, 
        { key: 'maint', label: t('th_maint') },
        { key: 'cost_trip', label: t('th_cost_trip') }, 
        { key: 'cost_ton', label: t('th_cost_ton') },
        { key: 'distance', label: t('th_distance') }, 
        { key: 'km_per_trip', label: t('th_km_trip') },
    ];

    const sortedData = useMemo(() => {
        const sorted = [...tableData];
        sorted.sort((a, b) => {
            const valA = a[sortBy]; const valB = b[sortBy];
            if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB, language);
            if (typeof valA === 'number' && typeof valB === 'number') return valB - valA;
            return 0;
        });
        return sorted;
    }, [tableData, sortBy, language]);
    
    const totals = useMemo(() => {
        if (sortedData.length === 0) return null;
        
        const totalTrips = sortedData.reduce((s, r) => s + r.trips, 0);
        const totalTons = sortedData.reduce((s, r) => s + r.tons, 0);
        const totalFuel = sortedData.reduce((s, r) => s + r.fuel, 0);
        const totalMaint = sortedData.reduce((s, r) => s + r.maint, 0);
        const totalDistance = sortedData.reduce((s, r) => s + r.distance, 0);
        const totalActualDailyCap = sortedData.reduce((s, r) => s + r.actual_daily_cap, 0);
        const totalCapTon = sortedData.reduce((s, r) => s + r.cap_ton, 0);
        const totalCapM3 = sortedData.reduce((s, r) => s + r.cap_m3, 0);
        
        const totalCost = totalFuel + totalMaint;
        
        return { 
            totalTrips, 
            totalTons, 
            totalFuel, 
            totalMaint, 
            totalDistance, 
            totalActualDailyCap,
            totalCapTon,
            totalCapM3,
            avgCostTrip: totalTrips > 0 ? totalCost / totalTrips : 0, 
            avgCostTon: totalTons > 0 ? totalCost / totalTons : 0, 
            avgKmTrip: totalTrips > 0 ? totalDistance / totalTrips : 0 
        };
    }, [sortedData]);

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Vehicles_Efficiency`);
    };

    return (
        <CollapsibleSection title={title || t('sec_veh_eff')}>
             <div className="flex items-center justify-between gap-4 mb-6 text-sm">
                <div>
                    <label className="ml-2 font-semibold text-slate-700 dark:text-slate-300">{t('chart_grouping')}</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as keyof VehicleTableData)}
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <ExportDropdown 
                    onExportPdf={() => printTable(tableContainerRef, title || t('sec_veh_eff'), filters, t, language)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Table_Export`)}
                />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700" ref={tableContainerRef}>
                <table id="vehicle-efficiency-table" className="w-full text-xs text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                        <tr>
                            {headers.map(h => (
                                <th key={h.key} className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 relative group">
                                    <div className="flex items-center justify-center gap-1">
                                        {h.label}
                                        {h.description && (
                                            <span className="cursor-help text-slate-400">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-right leading-relaxed`}>
                                                    {h.description}
                                                </div>
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map(row => (
                            <tr key={row.veh} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{row.veh}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.area}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.drivers}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.year}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.cap_m3, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">{formatNumber(row.cap_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-900/10">
                                    {formatNumber(row.actual_daily_cap, 2)}
                                </td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.trips)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.tons, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.fuel, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.maint, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-blue-600 dark:text-blue-400">{formatNumber(row.cost_trip, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-blue-600 dark:text-blue-400">{formatNumber(row.cost_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.distance, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(row.km_per_trip, 1)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {totals && (
                        <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-600">
                            <tr>
                                <td className="p-3" colSpan={4}>{t('total_avg')}</td>
                                <td className="p-3">{formatNumber(totals.totalCapM3, 1)}</td>
                                <td className="p-3">{formatNumber(totals.totalCapTon, 1)}</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-400">{formatNumber(totals.totalActualDailyCap, 1)}</td>
                                <td className="p-3">{formatNumber(totals.totalTrips)}</td>
                                <td className="p-3">{formatNumber(totals.totalTons, 1)}</td>
                                <td className="p-3">{formatNumber(totals.totalFuel, 0)}</td>
                                <td className="p-3">{formatNumber(totals.totalMaint, 0)}</td>
                                <td className="p-3 text-blue-700 dark:text-blue-400">{formatNumber(totals.avgCostTrip, 1)}</td>
                                <td className="p-3 text-blue-700 dark:text-blue-400">{formatNumber(totals.avgCostTon, 1)}</td>
                                <td className="p-3">{formatNumber(totals.totalDistance, 1)}</td>
                                <td className="p-3 text-indigo-700 dark:text-indigo-400">{formatNumber(totals.avgKmTrip, 1)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default TableSection;
