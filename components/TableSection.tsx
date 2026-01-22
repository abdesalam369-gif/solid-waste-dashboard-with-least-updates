
import React, { useState, useMemo, useRef } from 'react';
import { VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
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
        { key: 'trips', label: t('th_trips') }, 
        { key: 'tons', label: t('th_tons') },
        { key: 'fuel', label: t('th_fuel') }, 
        { key: 'maint', label: t('th_maint') },
        { key: 'cost_trip', label: t('th_cost_trip') }, 
        { key: 'cost_ton', label: t('th_cost_ton') },
        { key: 'distance', label: t('th_distance') },
        { key: 'km_per_trip', label: t('th_km_trip') },
    ];

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
        const totalTrips = sortedData.reduce((s, r) => s + r.trips, 0);
        const totalTons = sortedData.reduce((s, r) => s + r.tons, 0);
        const totalFuel = sortedData.reduce((s, r) => s + r.fuel, 0);
        const totalMaint = sortedData.reduce((s, r) => s + r.maint, 0);
        const totalDistance = sortedData.reduce((s, r) => s + r.distance, 0);
        const totalCost = totalFuel + totalMaint;
        
        const avgCostTrip = totalTrips > 0 ? totalCost / totalTrips : 0;
        const avgCostTon = totalTons > 0 ? totalCost / totalTons : 0;
        const avgKmTrip = totalTrips > 0 ? totalDistance / totalTrips : 0;
        
        return { totalTrips, totalTons, totalFuel, totalMaint, totalDistance, avgCostTrip, avgCostTon, avgKmTrip };
    }, [sortedData]);

    const handlePrint = () => {
        printTable(tableContainerRef, title || t('sec_veh_eff'), filters, t, language);
    };

    if (tableData.length === 0) return null;

    return (
        <CollapsibleSection title={title || t('sec_veh_eff')}>
             <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="tableSort" className="ml-2 font-semibold">{t('chart_grouping')}</label>
                    <select id="tableSort" value={sortBy} onChange={e => setSortBy(e.target.value as keyof VehicleTableData)}
                        className="p-2 border border-slate-300 rounded-lg">
                        {headers.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    {t('print')}
                </button>
            </div>
            <div className="overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-100">
                        <tr>
                            {headers.map(h => <th key={h.key} className="p-2 border-b border-slate-200 font-semibold text-slate-600">{h.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(row => (
                            <tr key={row.veh} className="hover:bg-slate-50">
                                <td className="p-2 border-b border-slate-200 font-bold">{row.veh}</td>
                                <td className="p-2 border-b border-slate-200">{areaMapping[row.area] || row.area}</td>
                                <td className={`p-2 border-b border-slate-200 ${row.drivers.includes(',') ? 'text-xs' : ''}`}>{row.drivers}</td>
                                <td className="p-2 border-b border-slate-200">{row.year}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.cap_m3, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.cap_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.trips)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.tons, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.fuel, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.maint, 1)}</td>
                                <td className="p-2 border-b border-slate-200 font-semibold text-blue-600">{formatNumber(row.cost_trip, 1)}</td>
                                <td className="p-2 border-b border-slate-200 font-semibold text-blue-600">{formatNumber(row.cost_ton, 1)}</td>
                                <td className="p-2 border-b border-slate-200">{formatNumber(row.distance, 1)}</td>
                                <td className="p-2 border-b border-slate-200 font-semibold text-indigo-600">{formatNumber(row.km_per_trip, 1)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="font-bold bg-slate-200">
                                <td className="p-2 border-b border-slate-300">{t('total_avg')}</td>
                                <td colSpan={5} className="p-2 border-b border-slate-300"></td>
                                <td className="p-2 border-b border-slate-300">{formatNumber(totals.totalTrips)}</td>
                                <td className="p-2 border-b border-slate-300">{formatNumber(totals.totalTons, 1)}</td>
                                <td className="p-2 border-b border-slate-300">{formatNumber(totals.totalFuel, 1)}</td>
                                <td className="p-2 border-b border-slate-300">{formatNumber(totals.totalMaint, 1)}</td>
                                <td className="p-2 border-b border-slate-300 text-blue-700">{formatNumber(totals.avgCostTrip, 1)}</td>
                                <td className="p-2 border-b border-slate-300 text-blue-700">{formatNumber(totals.avgCostTon, 1)}</td>
                                <td className="p-2 border-b border-slate-300">{formatNumber(totals.totalDistance, 1)}</td>
                                <td className="p-2 border-b border-slate-300 text-indigo-800" colSpan={1}>{formatNumber(totals.avgKmTrip, 1)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default TableSection;
