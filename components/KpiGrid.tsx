
import React, { useMemo } from 'react';
import { Trip, Fuel, Maintenance, VehicleTableData, Worker, WasteTreatment } from '../types';
import { MONTHS_ORDER } from '../constants';
import { formatNumber } from '../services/dataService';
import KpiCard from './KpiCard';
import { useLanguage } from '../contexts/LanguageContext';

interface KpiGridProps {
    filteredTrips: Trip[];
    comparisonTrips: Trip[];
    fuelData: Fuel[];
    maintData: Maintenance[];
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
    comparisonYear: string;
    vehicleTableData: VehicleTableData[];
    comparisonVehicleTableData: VehicleTableData[];
    totalPopulation?: number;
    totalServed?: number;
    coverageRate?: number;
    workers: Worker[];
    revenueDetail?: { total: number; hh: number; commercial: number; recycling: number } | null;
    comparisonRevenueDetail?: { total: number; hh: number; commercial: number; recycling: number } | null;
    treatment?: (WasteTreatment & { totalTreated: number }) | null;
    comparisonTreatment?: (WasteTreatment & { totalTreated: number }) | null;
}

const KpiGrid: React.FC<KpiGridProps> = ({ 
    filteredTrips, comparisonTrips, fuelData, maintData, filters, 
    selectedYear, comparisonYear, vehicleTableData, comparisonVehicleTableData,
    totalPopulation, totalServed, coverageRate, workers,
    revenueDetail, comparisonRevenueDetail,
    treatment, comparisonTreatment
}) => {
    const { t } = useLanguage();
    
    const calculateStats = (trips: Trip[], year: string, tableData: VehicleTableData[]) => {
        if (!trips.length && !year) return null;

        const totalTons = trips.reduce<number>((sum, trip) => sum + (Number(trip['صافي التحميل']) || 0) / 1000, 0);
        const totalTrips = trips.length;
        const activeVehicles = new Set(trips.map(r => r['رقم المركبة']).filter(Boolean));
        
        const sumFuelForVehicle = (veh: string): number => {
            const row = fuelData.find(x => x['رقم المركبة'] === veh && x['السنة'] === year);
            if (!row) return 0;
            const monthsToSum = filters.months.size ? Array.from(filters.months) : MONTHS_ORDER;
            return monthsToSum.reduce<number>((s, m) => s + (Number(row[m as keyof Fuel]) || 0), 0);
        };

        const maintForVehicle = (veh: string): number => {
            const row = maintData.find(x => x['رقم المركبة'] === veh && x['السنة'] === year);
            return row ? (Number(row['كلفة الصيانة']) || 0) : 0;
        };
        
        let totalFuel = 0;
        let totalMaint = 0;
        activeVehicles.forEach(v => {
            totalFuel += sumFuelForVehicle(v);
            totalMaint += maintForVehicle(v);
        });

        const daysSet = new Set(trips.map(r => {
            const d = new Date(r['تاريخ التوزين الثاني']);
            return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
        }).filter(Boolean));
        const daysCount = daysSet.size;
        const avgTonsPerDay = daysCount > 0 ? totalTons / daysCount : 0;

        const agg: { [key: string]: { trips: number; tons: number } } = {};
        trips.forEach(r => {
            const v = r['رقم المركبة'];
            if (!v) return;
            if (!agg[v]) agg[v] = { trips: 0, tons: 0 };
            agg[v].trips += 1;
            agg[v].tons += (Number(r['صافي التحميل'] || 0) / 1000);
        });

        let topTripsVeh = "—", topTripsVal = 0, topTonsVeh = "—", topTonsVal = 0;
        Object.entries(agg).forEach(([v, data]) => {
            if (data.trips > topTripsVal) {
                topTripsVal = data.trips;
                topTripsVeh = v;
            }
            if (data.tons > topTonsVal) {
                topTonsVal = data.tons;
                topTonsVeh = v;
            }
        });

        const activeVehicleDetails = tableData.filter(v => activeVehicles.has(v.veh));
        const totalCapacity = activeVehicleDetails.reduce((sum, v) => sum + v.cap_ton, 0);
        const avgCapacity = activeVehicles.size > 0 ? totalCapacity / activeVehicles.size : 0;

        return {
            totalTons, totalTrips, totalFuel, totalMaint, avgTonsPerDay, daysCount,
            activeVehiclesCount: activeVehicles.size,
            topTrips: topTripsVal > 0 ? `${topTripsVeh} | ${formatNumber(topTripsVal)}` : '—',
            topTons: topTonsVal > 0 ? `${topTonsVeh} | ${formatNumber(topTonsVal, 1)} ${t('unit_ton')}` : '—',
            avgCapacity
        };
    };

    const currentStats = useMemo(() => calculateStats(filteredTrips, selectedYear, vehicleTableData), [filteredTrips, selectedYear, fuelData, maintData, filters, vehicleTableData]);
    const comparisonStats = useMemo(() => comparisonYear ? calculateStats(comparisonTrips, comparisonYear, comparisonVehicleTableData) : null, [comparisonTrips, comparisonYear, fuelData, maintData, filters, comparisonVehicleTableData]);

    const totalSalaries = useMemo(() => {
        return workers.reduce((sum, w) => sum + w.salary, 0);
    }, [workers]);

    const metrics = useMemo(() => {
        if (!currentStats) return null;
        
        const totalCosts = currentStats.totalFuel + currentStats.totalMaint + totalSalaries;
        const costPerTon = currentStats.totalTons > 0 ? totalCosts / currentStats.totalTons : 0;
        const costPerTrip = currentStats.totalTrips > 0 ? totalCosts / currentStats.totalTrips : 0;
        const avgTonsPerTrip = currentStats.totalTrips > 0 ? currentStats.totalTons / currentStats.totalTrips : 0;
        const avgTripsPerDay = currentStats.daysCount > 0 ? currentStats.totalTrips / currentStats.daysCount : 0;
        
        const kgPerCapita = (totalPopulation && totalPopulation > 0) ? (currentStats.totalTons * 1000) / totalPopulation : 0;
        const costPerCapita = (totalPopulation && totalPopulation > 0) ? totalCosts / totalPopulation : 0;
        
        const avgTripsPerVehicle = currentStats.activeVehiclesCount > 0 ? currentStats.totalTrips / currentStats.activeVehiclesCount : 0;
        const areasCount = totalPopulation ? 7 : 0; 

        const currentRevenueTotal = revenueDetail?.total || 0;
        const costRecovery = totalCosts > 0 ? (currentRevenueTotal / totalCosts) * 100 : 0;

        const totalGenerated = currentStats.totalTons + (treatment?.totalTreated || 0);
        const recyclingRate = totalGenerated > 0 ? ((treatment?.recyclablesTon || 0) / totalGenerated) * 100 : 0;
        const alternativeTreatmentRate = totalGenerated > 0 ? ((treatment?.totalTreated || 0) / totalGenerated) * 100 : 0;

        return { totalCosts, costPerTon, costPerTrip, avgTonsPerTrip, avgTripsPerDay, kgPerCapita, areasCount, costPerCapita, avgTripsPerVehicle, costRecovery, totalGenerated, recyclingRate, alternativeTreatmentRate };
    }, [currentStats, totalSalaries, totalPopulation, revenueDetail, treatment]);

    if (!currentStats || !metrics) return null;

    const sections = [
        {
            title: t('sec_population'),
            cards: [
                { value: formatNumber(totalPopulation), label: t('kpi_total_pop'), icon: '👥', color: 'text-cyan-600', emphasized: true },
                { value: formatNumber(totalServed), label: t('kpi_served_pop'), icon: '🏠', color: 'text-emerald-600' },
                { value: formatNumber(coverageRate, 1) + '%', label: t('kpi_coverage_rate'), icon: '📡', color: 'text-indigo-600' },
                { value: formatNumber(metrics.areasCount), label: t('kpi_areas_served'), icon: '📍', color: 'text-rose-500' },
                { value: formatNumber(workers.length), label: t('kpi_workers_count'), icon: '👷', color: 'text-slate-700' }
            ]
        },
        {
            title: t('sec_operational'),
            cards: [
                { value: formatNumber(currentStats.totalTrips), label: t('kpi_total_trips'), icon: '🚚', color: 'text-sky-500', comp: comparisonStats?.totalTrips ? formatNumber(comparisonStats.totalTrips) : undefined, emphasized: true },
                { value: formatNumber(currentStats.daysCount), label: t('kpi_op_days'), icon: '📅', color: 'text-pink-600', comp: comparisonStats?.daysCount ? formatNumber(comparisonStats.daysCount) : undefined },
                { value: formatNumber(metrics.avgTripsPerDay, 1), label: t('kpi_avg_trips_day'), icon: '🔄', color: 'text-sky-600' },
                { value: formatNumber(metrics.avgTonsPerTrip, 1), label: t('kpi_avg_load_trip'), icon: '⚖️', color: 'text-slate-600' },
                { value: formatNumber(currentStats.avgTonsPerDay, 1), label: t('kpi_avg_tons_day'), icon: '📊', color: 'text-green-600', comp: comparisonStats?.avgTonsPerDay ? formatNumber(comparisonStats.avgTonsPerDay, 1) : undefined }
            ]
        },
        {
            title: t('sec_waste_production'),
            cards: [
                { value: formatNumber(Math.round(metrics.totalGenerated)), label: t('kpi_total_tons'), icon: '🗑️', color: 'text-blue-600', emphasized: true },
                { value: formatNumber(metrics.kgPerCapita, 1) + ' ' + t('unit_kg'), label: t('kpi_per_capita_waste'), icon: '👤', color: 'text-indigo-500' },
                { value: formatNumber(currentStats.avgTonsPerDay, 1), label: t('kpi_daily_waste_rate'), icon: '📈', color: 'text-teal-600' }
            ]
        },
        {
            title: t('sec_treatment'),
            cards: [
                { value: formatNumber(metrics.recyclingRate, 1) + '%', label: t('kpi_recycling_rate'), icon: '♻️', color: 'text-emerald-600', emphasized: true },
                { value: formatNumber(metrics.alternativeTreatmentRate, 1) + '%', label: t('kpi_alt_treatment_rate'), icon: '🧪', color: 'text-indigo-600' },
                { value: formatNumber(treatment?.totalTreated, 1) + ' ' + t('unit_ton'), label: t('kpi_total_treated'), icon: '⚙️', color: 'text-blue-500' },
                { value: formatNumber(treatment?.recyclablesTon, 1) + ' ' + t('unit_ton'), label: t('kpi_recyclables'), icon: '📦', color: 'text-amber-500' },
                { value: formatNumber(treatment?.biowasteTon, 1) + ' ' + t('unit_ton'), label: t('kpi_biowaste'), icon: '🍎', color: 'text-orange-600' }
            ]
        },
        {
            title: t('sec_fleet'),
            cards: [
                { value: formatNumber(currentStats.activeVehiclesCount), label: t('kpi_active_vehicles'), icon: '🚛', color: 'text-purple-600', comp: comparisonStats?.activeVehiclesCount ? formatNumber(comparisonStats.activeVehiclesCount) : undefined, emphasized: true },
                { value: formatNumber(currentStats.avgCapacity, 1), label: t('kpi_avg_capacity'), icon: '📦', color: 'text-amber-500', comp: comparisonStats?.avgCapacity ? formatNumber(comparisonStats.avgCapacity, 1) : undefined },
                { value: currentStats.topTrips, label: t('kpi_top_trips_veh'), icon: '🏆', color: 'text-indigo-600', comp: comparisonStats?.topTrips },
                { value: currentStats.topTons, label: t('kpi_top_weight_veh'), icon: '🏗️', color: 'text-teal-500', comp: comparisonStats?.topTons },
                { value: formatNumber(metrics.avgTripsPerVehicle, 1), label: t('kpi_avg_trips_veh'), icon: '🚜', color: 'text-orange-600' }
            ]
        },
        {
            title: t('sec_financial'),
            cards: [
                { value: formatNumber(Math.round(metrics.totalCosts)) + ' ' + t('unit_jd'), label: t('kpi_total_annual_expenses'), icon: '📈', color: 'text-emerald-800', emphasized: true },
                { value: formatNumber(Math.round(revenueDetail?.total || 0)) + ' ' + t('unit_jd'), label: t('kpi_total_revenue'), icon: '💰', color: 'text-blue-800', comp: comparisonRevenueDetail?.total ? formatNumber(Math.round(comparisonRevenueDetail.total)) : undefined, emphasized: true },
                { value: formatNumber(Math.round(revenueDetail?.hh || 0)) + ' ' + t('unit_jd'), label: t('kpi_hh_revenue'), icon: '🏠', color: 'text-blue-600' },
                { value: formatNumber(Math.round(revenueDetail?.commercial || 0)) + ' ' + t('unit_jd'), label: t('kpi_commercial_revenue'), icon: '🏢', color: 'text-indigo-600' },
                { value: formatNumber(metrics.costRecovery, 1) + '%', label: t('kpi_cost_recovery'), icon: '📈', color: 'text-indigo-700' },
                { value: formatNumber(Math.round(totalSalaries)), label: t('kpi_total_salaries'), icon: '💵', color: 'text-emerald-700' },
                { value: formatNumber(Math.round(currentStats.totalFuel)), label: t('kpi_fuel_cost'), icon: '⛽', color: 'text-orange-500', comp: comparisonStats?.totalFuel ? formatNumber(Math.round(comparisonStats.totalFuel)) : undefined },
                { value: formatNumber(Math.round(currentStats.totalMaint)), label: t('kpi_maint_cost'), icon: '🔧', color: 'text-red-600', comp: comparisonStats?.totalMaint ? formatNumber(Math.round(comparisonStats.totalMaint)) : undefined },
                { value: formatNumber(metrics.costPerTon, 1) + ' ' + t('unit_jd'), label: t('kpi_cost_per_ton'), icon: '💰', color: 'text-amber-600' },
                { value: formatNumber(metrics.costPerTrip, 1) + ' ' + t('unit_jd'), label: t('kpi_cost_per_trip'), icon: '🎟️', color: 'text-blue-700' },
                { value: formatNumber(metrics.costPerCapita, 1) + ' ' + t('unit_jd'), label: t('kpi_cost_per_capita'), icon: '🏷️', color: 'text-slate-800' }
            ]
        }
    ];

    const getGridColsClass = (count: number) => {
        if (count <= 3) return "md:grid-cols-3";
        if (count === 5) return "md:grid-cols-3 lg:grid-cols-5";
        return "md:grid-cols-3 lg:grid-cols-4";
    };

    return (
        <div id="kpi-grid" className="space-y-12 mb-12">
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-6 bg-slate-50/40 p-8 rounded-[40px] border border-slate-100/50 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-10 w-2 bg-blue-600 rounded-full shadow-sm shadow-blue-200"></div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">
                            {section.title}
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent"></div>
                    </div>
                    
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${getGridColsClass(section.cards.length)} gap-6 justify-center`}>
                        {section.cards.map((kpi, kIdx) => (
                            <div key={`${sIdx}-${kIdx}`} className={kpi.emphasized ? 'transform lg:scale-105 z-10' : ''}>
                                <KpiCard 
                                    value={kpi.value} 
                                    label={kpi.label} 
                                    icon={kpi.icon} 
                                    color={kpi.color} 
                                    comparisonValue={kpi.comp}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KpiGrid;
