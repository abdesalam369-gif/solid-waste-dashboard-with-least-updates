
import React, { useState, useMemo, useRef } from 'react';
import { VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';

interface UtilizationSectionProps {
    tableData: VehicleTableData[];
    filters: { vehicles: Set<string>; months: Set<string> };
}

type UtilizationData = {
    veh: string;
    cap_ton: number;
    avgTonsPerTrip: number;
    utilization: number;
};

const UtilizationSection: React.FC<UtilizationSectionProps> = ({ tableData, filters }) => {
    const { t, language } = useLanguage();
    const [sortBy, setSortBy] = useState<keyof UtilizationData>('utilization');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const utilizationData = useMemo<UtilizationData[]>(() => {
        return tableData.map(v => {
            const avgTonsPerTrip = v.trips > 0 ? v.tons / v.trips : 0;
            const utilization = v.cap_ton > 0 ? (avgTonsPerTrip / v.cap_ton) * 100 : 0;
            return {
                veh: v.veh,
                cap_ton: v.cap_ton,
                avgTonsPerTrip,
                utilization
            };
        });
    }, [tableData]);

    const sortedData = useMemo(() => {
        const sorted = [...utilizationData];
        sorted.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (sortBy === 'veh') {
                return String(valA).localeCompare(String(valB), language);
            }
            return (valB as number) - (valA as number);
        });
        return sorted;
    }, [utilizationData, sortBy, language]);

    const handlePrint = () => {
        printTable(tableContainerRef, t('sec_utilization'), filters, t, language);
    };

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Vehicle_Utilization`);
    };

    const headers = [
        { key: 'veh', label: t('th_veh_no') },
        { key: 'cap_ton', label: t('th_cap_ton') },
        { key: 'avgTonsPerTrip', label: t('th_avg_load') },
        { key: 'utilization', label: t('th_utilization') },
    ];

    return (
        <CollapsibleSection title={t('sec_utilization')}>
            <div className="flex items-center justify-between gap-4 mb-6 text-sm">
                <div>
                    <label htmlFor="utilizationSort" className="ml-2 font-semibold text-slate-700 dark:text-slate-300">{t('chart_grouping')}</label>
                    <select id="utilizationSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof UtilizationData)}
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <ExportDropdown 
                    onExportPdf={handlePrint}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Utilization_Export`)}
                />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700" ref={tableContainerRef}>
                <table id="utilization-table" className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map(row => (
                            <tr key={row.veh} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${row.utilization < 50 ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">{row.veh}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.cap_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.avgTonsPerTrip, 1)}</td>
                                <td className={`p-2 border-b border-slate-200 dark:border-slate-700 font-bold ${row.utilization < 50 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{formatNumber(row.utilization, 1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default UtilizationSection;
