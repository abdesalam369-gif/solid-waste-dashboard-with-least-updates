
import React, { useMemo } from 'react';
import { Trip, Fuel, Maintenance, VehicleTableData, Worker } from '../types';
import { MONTHS_ORDER } from '../constants';
import { formatNumber } from '../services/dataService';
import KpiCard from './KpiCard';

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
    workers: Worker[];
}

const KpiGrid: React.FC<KpiGridProps> = ({ 
    filteredTrips, comparisonTrips, fuelData, maintData, filters, 
    selectedYear, comparisonYear, vehicleTableData, comparisonVehicleTableData,
    totalPopulation, workers
}) => {
    
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

        // حساب أعلى مركبات
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

        // حساب متوسط السعة للمركبات النشطة
        const activeVehicleDetails = tableData.filter(v => activeVehicles.has(v.veh));
        const totalCapacity = activeVehicleDetails.reduce((sum, v) => sum + v.cap_ton, 0);
        const avgCapacity = activeVehicles.size > 0 ? totalCapacity / activeVehicles.size : 0;

        return {
            totalTons, totalTrips, totalFuel, totalMaint, avgTonsPerDay, daysCount,
            activeVehiclesCount: activeVehicles.size,
            topTrips: topTripsVal > 0 ? `${topTripsVeh} | ${formatNumber(topTripsVal)}` : '—',
            topTons: topTonsVal > 0 ? `${topTonsVeh} | ${formatNumber(topTonsVal, 1)} طن` : '—',
            avgCapacity
        };
    };

    const currentStats = useMemo(() => calculateStats(filteredTrips, selectedYear, vehicleTableData), [filteredTrips, selectedYear, fuelData, maintData, filters, vehicleTableData]);
    const comparisonStats = useMemo(() => comparisonYear ? calculateStats(comparisonTrips, comparisonYear, comparisonVehicleTableData) : null, [comparisonTrips, comparisonYear, fuelData, maintData, filters, comparisonVehicleTableData]);

    const totalSalaries = useMemo(() => {
        return workers.reduce((sum, w) => sum + w.salary, 0);
    }, [workers]);

    if (!currentStats) return null;

    const kpiCards = [
        { value: formatNumber(Math.round(currentStats.totalTons)), label: 'إجمالي الأطنان', icon: '🗑️', color: 'text-blue-600', comp: comparisonStats?.totalTons ? formatNumber(Math.round(comparisonStats.totalTons)) : undefined },
        { value: formatNumber(currentStats.totalTrips), label: 'إجمالي الرحلات', icon: '🚚', color: 'text-sky-500', comp: comparisonStats?.totalTrips ? formatNumber(comparisonStats.totalTrips) : undefined },
        { value: formatNumber(Math.round(currentStats.totalFuel)), label: 'كلفة الوقود', icon: '⛽', color: 'text-orange-500', comp: comparisonStats?.totalFuel ? formatNumber(Math.round(comparisonStats.totalFuel)) : undefined },
        { value: formatNumber(Math.round(currentStats.totalMaint)), label: 'كلفة الصيانة', icon: '🔧', color: 'text-red-600', comp: comparisonStats?.totalMaint ? formatNumber(Math.round(comparisonStats.totalMaint)) : undefined },
        { value: formatNumber(Math.round(totalSalaries)), label: 'إجمالي الرواتب', icon: '💵', color: 'text-emerald-700' },
        { value: formatNumber(currentStats.avgTonsPerDay, 1), label: 'متوسط الأطنان/يوم', icon: '📊', color: 'text-green-600', comp: comparisonStats?.avgTonsPerDay ? formatNumber(comparisonStats.avgTonsPerDay, 1) : undefined },
        { value: formatNumber(currentStats.daysCount), label: 'الأيام التشغيلية', icon: '📅', color: 'text-pink-600', comp: comparisonStats?.daysCount ? formatNumber(comparisonStats.daysCount) : undefined },
        { value: formatNumber(currentStats.activeVehiclesCount), label: 'المركبات النشطة', icon: '🚛', color: 'text-purple-600', comp: comparisonStats?.activeVehiclesCount ? formatNumber(comparisonStats.activeVehiclesCount) : undefined },
        { value: currentStats.topTrips, label: 'أعلى مركبة رحلات', icon: '🏆', color: 'text-indigo-600', comp: comparisonStats?.topTrips },
        { value: currentStats.topTons, label: 'أعلى مركبة وزن', icon: '⚖️', color: 'text-teal-500', comp: comparisonStats?.topTons },
        { value: formatNumber(currentStats.avgCapacity, 1), label: 'متوسط سعة المركبات (طن)', icon: '📦', color: 'text-amber-500', comp: comparisonStats?.avgCapacity ? formatNumber(comparisonStats.avgCapacity, 1) : undefined },
        { value: (typeof totalPopulation === 'number' && !isNaN(totalPopulation)) ? formatNumber(totalPopulation) : '—', label: 'إجمالي عدد السكان', icon: '👥', color: 'text-cyan-600' },
    ];

    return (
        <div id="kpi-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            {kpiCards.map(kpi => (
                <KpiCard 
                    key={kpi.label} 
                    value={kpi.value} 
                    label={kpi.label} 
                    icon={kpi.icon} 
                    color={kpi.color} 
                    comparisonValue={kpi.comp}
                />
            ))}
        </div>
    );
};

export default KpiGrid;
