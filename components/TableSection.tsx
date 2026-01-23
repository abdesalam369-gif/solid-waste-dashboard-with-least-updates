
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
        { key: 'veh', label: t('th_veh_no') }, { key: 'area', label: t('th_area') },
        { key: 'drivers', label: t('th_driver') }, { key: 'year', label: t('th_year') },
        { key: 'cap_m3', label: t('th_cap_m3') }, { key: 'cap_ton', label: t('th_cap_ton') },
        { key: 'trips', label: t('th_trips') }, { key: 'tons', label: t('th_tons') },
        { key: 'fuel', label: t('th_fuel') }, { key: 'maint', label: t('th_maint') },
        { key: 'cost_trip', label: t('th_cost_trip') }, { key: 'cost_ton', label: t('th_cost_ton') },
        { key: 'distance', label: t('th_distance') }, { key: 'km_per_trip', label: t('th_km_trip') },
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
        const totalCost = totalFuel + totalMaint;
        return { totalTrips, totalTons, totalFuel, totalMaint, totalDistance, avgCostTrip: totalTrips > 0 ? totalCost/totalTrips : 0, avgCostTon: totalTons > 0 ? totalCost/totalTons : 0, avgKmTrip: totalTrips > 0 ? totalDistance/totalTrips : 0 };
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
                <table className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>{headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">{h.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map(row => (
                            <tr key={row.veh} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{row.veh}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.area}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.drivers}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{row.year}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.cap_m3, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.cap_ton, 1)}</td>
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
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default TableSection;
