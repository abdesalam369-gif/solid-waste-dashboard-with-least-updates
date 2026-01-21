
import React, { useState, useMemo, useRef } from 'react';
import { DriverStatsData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
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

    const headers = [
        { key: 'driver', label: t('th_driver') },
        { key: 'trips', label: t('th_trips') },
        { key: 'tons', label: t('th_tons') },
        { key: 'avgTonsPerTrip', label: t('th_avg_load') },
        { key: 'vehicles', label: t('th_vehicles_used') },
    ];

    return (
        <CollapsibleSection title={t('sec_driver_perf')}>
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="driverSort" className="ml-2 font-semibold">{t('chart_grouping')}</label>
                    <select id="driverSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof DriverStatsData)}
                        className="p-2 border border-slate-300 rounded-lg">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    {t('print')}
                </button>
            </div>
            <div className="overflow-x-auto" ref={tableContainerRef}>
                <table id="driver-stats-table" className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-100">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 font-semibold text-slate-600">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 border-b border-slate-200">{row.driver}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.trips)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.tons, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.avgTonsPerTrip, 1)}</td>
                                <td className={`p-2 border-b border-slate-200 ${row.vehicles.includes(',') ? 'text-xs' : ''}`}>{row.vehicles}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default DriverStatsSection;
