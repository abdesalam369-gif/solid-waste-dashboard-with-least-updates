
import React, { useState, useMemo, useRef } from 'react';
import { VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
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

    const headers = [
        { key: 'veh', label: t('th_veh_no') },
        { key: 'cap_ton', label: t('th_cap_ton') },
        { key: 'avgTonsPerTrip', label: t('th_avg_load') },
        { key: 'utilization', label: t('th_utilization') },
    ];

    return (
        <CollapsibleSection title={t('sec_utilization')}>
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="utilizationSort" className="ml-2 font-semibold">{t('chart_grouping')}</label>
                    <select id="utilizationSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof UtilizationData)}
                        className="p-2 border border-slate-300 rounded-lg">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    {t('print')}
                </button>
            </div>
            <div className="overflow-x-auto" ref={tableContainerRef}>
                <table id="utilization-table" className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-100">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 font-semibold text-slate-600">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(row => (
                            <tr key={row.veh} className={`hover:bg-slate-50 ${row.utilization < 50 ? 'bg-red-100 underutilized' : ''}`}>
                                <td className="p-2 border-b border-slate-200">{row.veh}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.cap_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.avgTonsPerTrip, 1)}</td>
                                <td className="p-2 border-b border-slate-200 font-bold">{formatNumber(row.utilization, 1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default UtilizationSection;
