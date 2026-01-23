
import React, { useMemo, useState, useRef } from 'react';
import { Trip, WasteTreatment, Population, Worker, Revenue, VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import KpiCard from './KpiCard';
import KpiExplanationModal from './KpiExplanationModal';
import ExportDropdown from './ExportDropdown';
import { exportToExcel, exportToImage } from '../services/exportService';
import { useLanguage } from '../contexts/LanguageContext';

interface AnnualSummarySectionProps {
    filteredTrips: Trip[];
    treatment?: (WasteTreatment & { totalTreated: number }) | null;
    populationData: Population[];
    workers: Worker[];
    revenues: Revenue[];
    vehicleTableData: VehicleTableData[];
    selectedYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const AnnualSummarySection: React.FC<AnnualSummarySectionProps> = ({ 
    filteredTrips, treatment, populationData, workers, revenues, vehicleTableData, selectedYear, filters 
}) => {
    const { t, language } = useLanguage();
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const stats = useMemo(() => {
        const totalCollectedTons = filteredTrips.reduce((sum, trip) => sum + (Number(trip['صافي التحميل']) || 0) / 1000, 0);
        const totalTreated = treatment?.totalTreated || 0;
        const totalGeneratedTons = totalCollectedTons + totalTreated;
        const yearPopData = populationData.filter(p => p.year === selectedYear);
        const totalPopulation = yearPopData.reduce((sum, p) => sum + p.population, 0);
        const totalServed = yearPopData.reduce((sum, p) => sum + p.served, 0);
        const wastePerCapita = totalPopulation > 0 ? (totalGeneratedTons * 1000) / totalPopulation / 365 : 0;
        const wastePerCapitaNSWMS = 0.87;
        const coverageRate = totalPopulation > 0 ? (totalServed / totalPopulation) * 100 : 0;
        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        const totalSalaries = workers.reduce((sum, w) => sum + (w.salary / 12) * monthsCount, 0);
        const totalFuel = vehicleTableData.reduce((sum, v) => sum + v.fuel, 0);
        const totalMaint = vehicleTableData.reduce((sum, v) => sum + v.maint, 0);
        const totalCost = totalSalaries + totalFuel + totalMaint;
        const costPerTon = totalGeneratedTons > 0 ? totalCost / totalGeneratedTons : 0;
        const costPerCapita = totalPopulation > 0 ? totalCost / totalPopulation : 0;
        const costAffordability = (costPerCapita / 4.9) * 100;
        const yearRevenues = revenues.filter(r => r.year === selectedYear);
        const totalRevenue = yearRevenues.reduce((sum, r) => sum + r.hhFees + r.commercialFees + r.recyclingRevenue, 0);
        const costRecovery = totalCost > 0 ? (totalRevenue / totalCost) * 100 : 0;
        const recyclingRate = totalGeneratedTons > 0 ? ((treatment?.recyclablesTon || 0) / totalGeneratedTons) * 100 : 0;
        const diversionRate = totalGeneratedTons > 0 ? (totalTreated / totalGeneratedTons) * 100 : 0;

        return {
            totalGeneratedTons, wastePerCapita, wastePerCapitaNSWMS, totalPopulation,
            coverageRate, totalCost, costPerTon, costPerCapita, costAffordability,
            totalRevenue, costRecovery, recyclingRate, diversionRate
        };
    }, [filteredTrips, treatment, populationData, workers, revenues, vehicleTableData, selectedYear, filters.months]);

    const groups = [
        {
            title: t('group_waste'),
            cards: [
                { value: formatNumber(Math.round(stats.totalGeneratedTons)) + ' ' + t('unit_ton'), label: t('kpi_sum_total_waste'), icon: '🗑️', color: 'text-blue-600' },
                { value: formatNumber(stats.wastePerCapita, 2) + ' ' + t('unit_kg'), label: t('kpi_sum_waste_capita'), icon: '👤', color: 'text-sky-500' },
                { value: formatNumber(stats.wastePerCapitaNSWMS, 2) + ' ' + t('unit_kg'), label: t('kpi_sum_waste_nswms'), icon: '📋', color: 'text-indigo-500' },
            ]
        },
        {
            title: t('group_service'),
            cards: [
                { value: formatNumber(stats.totalPopulation), label: t('kpi_total_pop'), icon: '👥', color: 'text-cyan-600' },
                { value: formatNumber(stats.coverageRate, 1) + '%', label: t('kpi_sum_coverage'), icon: '📡', color: 'text-emerald-600' },
            ]
        },
        {
            title: t('group_financial'),
            cards: [
                { value: formatNumber(Math.round(stats.totalCost)) + ' ' + t('unit_jd'), label: t('kpi_sum_total_cost'), icon: '📈', color: 'text-indigo-600' },
                { value: formatNumber(stats.costPerTon, 1) + ' ' + t('unit_jd'), label: t('kpi_sum_cost_ton'), icon: '💰', color: 'text-amber-600' },
                { value: formatNumber(stats.costPerCapita, 1) + ' ' + t('unit_jd'), label: t('kpi_sum_cost_capita'), icon: '🏷️', color: 'text-slate-700' },
                { 
                    value: formatNumber(stats.costAffordability, 1) + '%', 
                    label: t('kpi_sum_cost_affordability'), 
                    icon: '🛡️', 
                    color: stats.costAffordability > 100 ? 'text-red-600' : 'text-indigo-600 dark:text-indigo-400' 
                },
                { value: formatNumber(Math.round(stats.totalRevenue)) + ' ' + t('unit_jd'), label: t('kpi_sum_total_revenue'), icon: '💵', color: 'text-blue-700' },
                { value: formatNumber(stats.costRecovery, 1) + '%', label: t('kpi_sum_cost_recovery'), icon: '⚖️', color: 'text-teal-600' },
            ]
        },
        {
            title: t('group_treatment'),
            cards: [
                { value: formatNumber(stats.recyclingRate, 1) + '%', label: t('kpi_sum_recycling'), icon: '♻️', color: 'text-emerald-700' },
                { value: formatNumber(stats.diversionRate, 1) + '%', label: t('kpi_sum_diversion'), icon: '🧪', color: 'text-purple-600' },
            ]
        }
    ];

    const handleExportExcel = () => {
        const data = groups.flatMap(g => g.cards.map(c => ({ Category: g.title, KPI: c.label, Value: c.value })));
        exportToExcel(data, `Summary_${selectedYear}`);
    };

    return (
        <div id="annual-summary-content" ref={containerRef} className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('sec_annual_summary')} - {selectedYear}</h2>
                <div className="flex gap-4">
                    <ExportDropdown 
                        onExportPdf={() => window.print()} 
                        onExportExcel={handleExportExcel}
                        onExportCsv={handleExportExcel}
                        onExportImage={() => exportToImage(containerRef, `Summary_${selectedYear}`)}
                    />
                    <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-2xl font-bold border border-blue-100 dark:border-blue-900/50 hidden md:block">
                        {t('primary_kpi')}
                    </div>
                </div>
            </div>

            {groups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-8 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 tracking-tight">{group.title}</h3>
                        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {group.cards.map((kpi, kIdx) => (
                            <KpiCard 
                                key={`${gIdx}-${kIdx}`}
                                value={kpi.value} label={kpi.label} icon={kpi.icon} color={kpi.color} 
                                onClick={() => setSelectedMetric(kpi.label)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <KpiExplanationModal 
                isOpen={!!selectedMetric}
                onClose={() => setSelectedMetric(null)}
                label={selectedMetric || ''}
            />
        </div>
    );
};

export default AnnualSummarySection;
