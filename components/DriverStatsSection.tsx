
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

    return (
        <CollapsibleSection title={t('sec_driver_perf')}>
            <div className="flex items-center justify-between gap-4 mb-6 text-sm">
                <div>
                    <label htmlFor="driverSort" className="ml-2 font-semibold text-slate-700 dark:text-slate-300">{t('chart_grouping')}</label>
                    <select id="driverSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof DriverStatsData)}
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <ExportDropdown 
                    onExportPdf={handlePrint}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Drivers_Stats_Export`)}
                />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700" ref={tableContainerRef}>
                <table id="driver-stats-table" className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">{row.driver}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.trips)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.tons, 1)}</td>
                                <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{formatNumber(row.avgTonsPerTrip, 1)}</td>
                                <td className={`p-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${row.vehicles.includes(',') ? 'text-xs' : ''}`}>{row.vehicles}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default DriverStatsSection;
