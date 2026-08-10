import React, { useMemo, useState } from 'react';
import { Fuel, VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import CollapsibleSection from './CollapsibleSection';
import KpiCard from './KpiCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { MONTHS_ORDER } from '../constants';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line, Cell, AreaChart, Area
} from 'recharts';

interface FuelAnalysisSectionProps {
    fuelData: Fuel[];
    fuelLitersData: Fuel[];
    vehicleData?: VehicleTableData[];
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
    comparisonYear?: string;
    onComparisonYearChange?: (year: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const LITERS_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#e11d48'];

const FuelAnalysisSection: React.FC<FuelAnalysisSectionProps> = ({
    fuelData, fuelLitersData, vehicleData, filters, selectedYear, comparisonYear, onComparisonYearChange
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const [metricMode, setMetricMode] = useState<'both' | 'liters' | 'cost'>('both');

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        fuelData.forEach(r => { if (r['السنة']) years.add(r['السنة']); });
        return Array.from(years).sort().reverse();
    }, [fuelData]);

    const activeMonths = useMemo(() => {
        if (filters.months.size > 0) {
            return MONTHS_ORDER.filter(m => filters.months.has(m));
        }

        // Determine months that actually have data for the selected year
        const yearFuelCostRows = fuelData.filter(r => {
            const matchYear = r['السنة'] === selectedYear;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            return matchYear && matchVehicle;
        });

        const yearFuelLitersRows = fuelLitersData.filter(r => {
            const matchYear = r['السنة'] === selectedYear;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            return matchYear && matchVehicle;
        });

        const activeSet = new Set<string>();
        MONTHS_ORDER.forEach(m => {
            let hasData = false;
            for (const r of yearFuelCostRows) {
                if (Number(r[m as keyof Fuel] || 0) > 0) {
                    hasData = true;
                    break;
                }
            }
            if (!hasData) {
                for (const r of yearFuelLitersRows) {
                    if (Number(r[m as keyof Fuel] || 0) > 0) {
                        hasData = true;
                        break;
                    }
                }
            }
            if (hasData) {
                activeSet.add(m);
            }
        });

        // Fallback: If no months have > 0 data for selected year, default to all months
        if (activeSet.size === 0) {
            return MONTHS_ORDER;
        }

        return MONTHS_ORDER.filter(m => activeSet.has(m));
    }, [filters.months, filters.vehicles, fuelData, fuelLitersData, selectedYear]);

    // Calculate per-vehicle stats for a given year
    const calculateYearStats = (year: string) => {
        if (!year) return { totalCost: 0, totalLiters: 0, vehicleStats: new Map<string, { cost: number; liters: number }>() };

        const vehicleMap = new Map<string, { cost: number; liters: number }>();

        // Filter rows by year & vehicles filter
        const yearFuelCostRows = fuelData.filter(r => {
            const matchYear = r['السنة'] === year;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            return matchYear && matchVehicle;
        });

        const yearFuelLitersRows = fuelLitersData.filter(r => {
            const matchYear = r['السنة'] === year;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            return matchYear && matchVehicle;
        });

        // Collect all vehicles present in rows
        const allVehicles = new Set<string>();
        yearFuelCostRows.forEach(r => { if (r['رقم المركبة']) allVehicles.add(r['رقم المركبة']); });
        yearFuelLitersRows.forEach(r => { if (r['رقم المركبة']) allVehicles.add(r['رقم المركبة']); });

        let totalCost = 0;
        let totalLiters = 0;

        allVehicles.forEach(v => {
            const costRow = yearFuelCostRows.find(r => r['رقم المركبة'] === v);
            const litersRow = yearFuelLitersRows.find(r => r['رقم المركبة'] === v);

            let vCost = 0;
            let vLiters = 0;

            activeMonths.forEach(m => {
                if (costRow) vCost += Number(costRow[m as keyof Fuel] || 0);
                if (litersRow) vLiters += Number(litersRow[m as keyof Fuel] || 0);
            });

            if (vCost > 0 || vLiters > 0) {
                vehicleMap.set(v, { cost: vCost, liters: vLiters });
                totalCost += vCost;
                totalLiters += vLiters;
            }
        });

        return { totalCost, totalLiters, vehicleStats: vehicleMap };
    };

    const currentStats = useMemo(() => calculateYearStats(selectedYear), [selectedYear, fuelData, fuelLitersData, filters, activeMonths]);
    const compStats = useMemo(() => {
        if (!comparisonYear || comparisonYear === selectedYear) {
            return { totalCost: 0, totalLiters: 0, vehicleStats: new Map<string, { cost: number; liters: number }>() };
        }
        return calculateYearStats(comparisonYear);
    }, [comparisonYear, selectedYear, fuelData, fuelLitersData, filters, activeMonths]);

    const kpis = useMemo(() => {
        const totalCost = currentStats.totalCost;
        const totalLiters = currentStats.totalLiters;
        const vehicleCount = currentStats.vehicleStats.size;
        const avgCostPerVehicle = vehicleCount > 0 ? totalCost / vehicleCount : 0;
        const avgLitersPerVehicle = vehicleCount > 0 ? totalLiters / vehicleCount : 0;

        let topVehicle = '—';
        let topCost = 0;
        let topLitersVehicle = '—';
        let topLiters = 0;

        currentStats.vehicleStats.forEach((stats, v) => {
            if (stats.cost > topCost) {
                topCost = stats.cost;
                topVehicle = v;
            }
            if (stats.liters > topLiters) {
                topLiters = stats.liters;
                topLitersVehicle = v;
            }
        });

        let lowestVehicle = '—';
        let lowestCost = Infinity;
        currentStats.vehicleStats.forEach((stats, v) => {
            if (stats.cost > 0 && stats.cost < lowestCost) {
                lowestCost = stats.cost;
                lowestVehicle = v;
            }
        });
        if (lowestCost === Infinity) lowestCost = 0;

        // YoY comparison values
        const compTotalCost = compStats.totalCost;
        const compTotalLiters = compStats.totalLiters;
        const compVehicleCount = compStats.vehicleStats.size;
        const compAvgCostPerVehicle = compVehicleCount > 0 ? compTotalCost / compVehicleCount : 0;

        const costDiff = totalCost - compTotalCost;
        const costDiffPercent = compTotalCost > 0 ? ((totalCost - compTotalCost) / compTotalCost) * 100 : 0;
        const litersDiff = totalLiters - compTotalLiters;
        const litersDiffPercent = compTotalLiters > 0 ? ((totalLiters - compTotalLiters) / compTotalLiters) * 100 : 0;

        return {
            totalCost,
            totalLiters,
            avgCostPerVehicle,
            avgLitersPerVehicle,
            topVehicle: topCost > 0 ? `${topVehicle} (${formatNumber(topCost)} ${t('unit_jd')})` : '—',
            topLitersVehicle: topLiters > 0 ? `${topLitersVehicle} (${formatNumber(topLiters)} ${t('unit_liters')})` : '—',
            lowestVehicle: lowestCost > 0 && lowestVehicle !== '—' ? `${lowestVehicle} (${formatNumber(lowestCost)} ${t('unit_jd')})` : '—',
            compTotalCost,
            compTotalLiters,
            compAvgCostPerVehicle,
            costDiff,
            costDiffPercent,
            litersDiff,
            litersDiffPercent,
            isComparing: !!comparisonYear && comparisonYear !== selectedYear
        };
    }, [currentStats, compStats, comparisonYear, selectedYear, t]);

    // Data sorted by Cost
    const vehicleCostChartData = useMemo(() => {
        return Array.from(currentStats.vehicleStats.entries())
            .map(([name, stats]) => ({
                name,
                cost: stats.cost,
                liters: stats.liters
            }))
            .sort((a, b) => b.cost - a.cost);
    }, [currentStats]);

    // Data sorted by Liters
    const vehicleLitersChartData = useMemo(() => {
        return Array.from(currentStats.vehicleStats.entries())
            .map(([name, stats]) => ({
                name,
                liters: stats.liters,
                cost: stats.cost
            }))
            .sort((a, b) => b.liters - a.liters);
    }, [currentStats]);

    const top5CostVehicles = useMemo(() => vehicleCostChartData.slice(0, 5), [vehicleCostChartData]);
    const top5LitersVehicles = useMemo(() => vehicleLitersChartData.slice(0, 5), [vehicleLitersChartData]);

    // Vehicle YoY Cost Data
    const vehicleYoYCostData = useMemo(() => {
        const allVehicles = Array.from(new Set([
            ...currentStats.vehicleStats.keys(),
            ...compStats.vehicleStats.keys()
        ]));

        return allVehicles.map(v => {
            const curr = currentStats.vehicleStats.get(v) || { cost: 0, liters: 0 };
            const comp = compStats.vehicleStats.get(v) || { cost: 0, liters: 0 };
            return {
                name: v,
                current: curr.cost,
                comparison: comp.cost
            };
        }).sort((a, b) => b.current - a.current).slice(0, 12);
    }, [currentStats, compStats]);

    // Vehicle YoY Liters Data
    const vehicleYoYLitersData = useMemo(() => {
        const allVehicles = Array.from(new Set([
            ...currentStats.vehicleStats.keys(),
            ...compStats.vehicleStats.keys()
        ]));

        return allVehicles.map(v => {
            const curr = currentStats.vehicleStats.get(v) || { cost: 0, liters: 0 };
            const comp = compStats.vehicleStats.get(v) || { cost: 0, liters: 0 };
            return {
                name: v,
                current: curr.liters,
                comparison: comp.liters
            };
        }).sort((a, b) => b.current - a.current).slice(0, 12);
    }, [currentStats, compStats]);

    // Monthly Cost Over Time
    const timeCostChartData = useMemo(() => {
        return activeMonths.map(m => {
            let currentMonthCost = 0;
            let compMonthCost = 0;

            fuelData.filter(r => r['السنة'] === selectedYear && (filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة'])))
                .forEach(r => {
                    currentMonthCost += Number(r[m as keyof Fuel] || 0);
                });

            if (comparisonYear && comparisonYear !== selectedYear) {
                fuelData.filter(r => r['السنة'] === comparisonYear && (filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة'])))
                    .forEach(r => {
                        compMonthCost += Number(r[m as keyof Fuel] || 0);
                    });
            }

            return {
                name: t(`month_${m}`),
                current: currentMonthCost,
                comparison: compMonthCost
            };
        });
    }, [fuelData, selectedYear, comparisonYear, filters.vehicles, activeMonths, t]);

    // Monthly Liters Over Time
    const timeLitersChartData = useMemo(() => {
        return activeMonths.map(m => {
            let currentMonthLiters = 0;
            let compMonthLiters = 0;

            fuelLitersData.filter(r => r['السنة'] === selectedYear && (filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة'])))
                .forEach(r => {
                    currentMonthLiters += Number(r[m as keyof Fuel] || 0);
                });

            if (comparisonYear && comparisonYear !== selectedYear) {
                fuelLitersData.filter(r => r['السنة'] === comparisonYear && (filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة'])))
                    .forEach(r => {
                        compMonthLiters += Number(r[m as keyof Fuel] || 0);
                    });
            }

            return {
                name: t(`month_${m}`),
                current: currentMonthLiters,
                comparison: compMonthLiters
            };
        });
    }, [fuelLitersData, selectedYear, comparisonYear, filters.vehicles, activeMonths, t]);

    const highFuelVehicles = useMemo(() => {
        if (vehicleCostChartData.length === 0) return [];
        const avgCost = vehicleCostChartData.reduce((sum, d) => sum + d.cost, 0) / vehicleCostChartData.length;
        return vehicleCostChartData.filter(d => d.cost > avgCost * 1.4);
    }, [vehicleCostChartData]);

    return (
        <CollapsibleSection title={t('sec_fuel_analysis')}>
            {/* Note callout banner about Liters comparison accuracy */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl mb-6 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs md:text-sm font-semibold">
                <span className="text-xl">💡</span>
                <div>
                    <span className="font-bold">{t('lbl_fuel_liters_advantage')}</span>
                </div>
            </div>

            {/* Toolbar: Metric Mode Toggle & Year Comparison Selector */}
            <div className="bg-white dark:bg-slate-800/80 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                {/* Metric Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl gap-1">
                    <button
                        onClick={() => setMetricMode('both')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            metricMode === 'both'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        📊 عرض شامل (لترات + دينار)
                    </button>
                    <button
                        onClick={() => setMetricMode('liters')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            metricMode === 'liters'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        🛢️ {t('tab_fuel_liters')}
                    </button>
                    <button
                        onClick={() => setMetricMode('cost')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            metricMode === 'cost'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        ⛽ {t('tab_fuel_cost')}
                    </button>
                </div>

                {/* Year Comparison Control */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>📅 {selectedYear}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">{t('compare_with')}</span>
                        <select
                            value={comparisonYear || ''}
                            onChange={(e) => onComparisonYearChange?.(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">{t('lbl_no_comparison_year')}</option>
                            {availableYears.filter(y => y !== selectedYear).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* YoY Comparison Banner if comparison active */}
            {kpis.isComparing && (
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 text-white p-5 md:p-6 rounded-3xl shadow-lg mb-8 border border-emerald-500/20">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-emerald-500/20 p-2.5 rounded-2xl text-2xl">🛢️</span>
                            <div>
                                <span className="text-xs uppercase tracking-wider text-emerald-300 font-extrabold">
                                    {t('fuel_yoy_comparison')} ({selectedYear} vs {comparisonYear})
                                </span>
                                <h3 className="text-lg md:text-xl font-black">
                                    {formatNumber(kpis.totalLiters)} {t('unit_liters')} ({formatNumber(kpis.totalCost)} {t('unit_jd')})
                                    <span className="text-xs font-normal text-slate-300 mx-2">مقابل</span>
                                    {formatNumber(kpis.compTotalLiters)} {t('unit_liters')} ({formatNumber(kpis.compTotalCost)} {t('unit_jd')})
                                </h3>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Liters diff badge */}
                            <div className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 ${
                                kpis.litersDiff <= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                                <span>{kpis.litersDiff <= 0 ? '📉' : '📈'}</span>
                                <span>
                                    تغير اللترات: {formatNumber(Math.abs(kpis.litersDiff))} {t('unit_liters')}
                                    ({kpis.litersDiffPercent > 0 ? '+' : ''}{kpis.litersDiffPercent.toFixed(1)}%)
                                </span>
                            </div>

                            {/* Cost diff badge */}
                            <div className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 ${
                                kpis.costDiff <= 0 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                                <span>
                                    تغير الكلفة: {formatNumber(Math.abs(kpis.costDiff))} {t('unit_jd')}
                                    ({kpis.costDiffPercent > 0 ? '+' : ''}{kpis.costDiffPercent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                        <div className="bg-white/5 p-3 rounded-xl border border-emerald-500/20">
                            <span className="text-emerald-300 font-bold block mb-1">🛢️ {t('kpi_total_fuel_liters')} (الأهم للمقارنة)</span>
                            <span className="font-extrabold text-white text-base">
                                {selectedYear}: {formatNumber(kpis.totalLiters)} {t('unit_liters')}
                            </span>
                            <span className="text-slate-300 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compTotalLiters)} {t('unit_liters')}
                            </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-slate-400 block mb-1">⛽ {t('kpi_fuel_cost')}</span>
                            <span className="font-bold text-white text-sm">
                                {selectedYear}: {formatNumber(kpis.totalCost)} {t('unit_jd')}
                            </span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compTotalCost)} {t('unit_jd')}
                            </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-slate-400 block mb-1">📊 {t('kpi_avg_fuel_veh')}</span>
                            <span className="font-bold text-white text-sm">
                                {selectedYear}: {formatNumber(kpis.avgCostPerVehicle)} {t('unit_jd')}
                            </span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compAvgCostPerVehicle)} {t('unit_jd')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div id="fuel-kpi-grid" className="kpi-section">
                <h3 className="hidden">{t('sec_fuel_analysis')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-8">
                    <KpiCard
                        value={formatNumber(kpis.totalLiters) + ' ' + t('unit_liters')}
                        label={t('kpi_total_fuel_liters')}
                        icon="🛢️"
                        color="text-emerald-600"
                    />
                    <KpiCard
                        value={formatNumber(kpis.totalCost) + ' ' + t('unit_jd')}
                        label={t('kpi_total_fuel_cost_sec')}
                        icon="⛽"
                        color="text-blue-600"
                    />
                    <KpiCard
                        value={formatNumber(kpis.avgLitersPerVehicle) + ' ' + t('unit_liters')}
                        label="متوسط استهلاك اللترات / مركبة"
                        icon="📊"
                        color="text-teal-600"
                    />
                    <KpiCard
                        value={kpis.topLitersVehicle}
                        label="أعلى مركبة استهلاكاً للترات"
                        icon="🏆"
                        color="text-amber-600"
                    />
                    <KpiCard
                        value={kpis.lowestVehicle}
                        label={t('kpi_lowest_fuel_veh')}
                        icon="🟢"
                        color="text-emerald-600"
                    />
                </div>
            </div>

            {/* Liters Charts Section (🛢️ استهلاك اللترات) */}
            {(metricMode === 'both' || metricMode === 'liters') && (
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl text-lg font-black">🛢️</span>
                        <div>
                            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100">
                                {t('chart_fuel_liters_per_veh')} & {t('chart_fuel_liters_over_time')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('lbl_fuel_liters_advantage')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                        {/* Liters per Vehicle Bar Chart */}
                        <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                                    {t('chart_fuel_liters_per_veh')} {kpis.isComparing ? `(${selectedYear} vs ${comparisonYear})` : `(${selectedYear})`}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    {t('unit_liters')}
                                </span>
                            </h4>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {kpis.isComparing ? (
                                        <BarChart data={vehicleYoYLitersData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                                formatter={(val: number) => formatNumber(val) + ' ' + t('unit_liters')}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Bar dataKey="current" name={`${selectedYear} (${t('unit_liters')})`} fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="comparison" name={`${comparisonYear} (${t('unit_liters')})`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <BarChart data={vehicleLitersChartData.slice(0, 15)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                                formatter={(val: number) => formatNumber(val) + ' ' + t('unit_liters')}
                                            />
                                            <Bar dataKey="liters" name={t('unit_liters')} fill="#10b981" radius={[4, 4, 0, 0]}>
                                                {vehicleLitersChartData.slice(0, 15).map((entry, index) => (
                                                    <Cell key={`cell-liters-${index}`} fill={LITERS_COLORS[index % LITERS_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly Liters Over Time Area/Line Chart */}
                        <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-teal-500 rounded-full"></span>
                                    {t('chart_fuel_liters_over_time')}
                                </span>
                                {kpis.isComparing && (
                                    <span className="text-xs font-semibold text-slate-400">
                                        {selectedYear} vs {comparisonYear}
                                    </span>
                                )}
                            </h4>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeLitersChartData}>
                                        <defs>
                                            <linearGradient id="colorLitersCurr" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorLitersComp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                            formatter={(val: number) => formatNumber(val) + ' ' + t('unit_liters')}
                                        />
                                        {kpis.isComparing && (
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        )}
                                        <Area
                                            type="monotone"
                                            dataKey="current"
                                            name={`${selectedYear} (${t('unit_liters')})`}
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorLitersCurr)"
                                        />
                                        {kpis.isComparing && (
                                            <Area
                                                type="monotone"
                                                dataKey="comparison"
                                                name={`${comparisonYear} (${t('unit_liters')})`}
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                fillOpacity={1}
                                                fill="url(#colorLitersComp)"
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cost (JD) Charts Section (⛽ كلف الوقود) */}
            {(metricMode === 'both' || metricMode === 'cost') && (
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-xl text-lg font-black">⛽</span>
                        <div>
                            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100">
                                {t('chart_fuel_per_veh')} & {t('chart_fuel_over_time')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('kpi_total_fuel_cost_sec')} ({t('unit_jd')})
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                        {/* Fuel Cost per Vehicle */}
                        <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                                    {t('chart_fuel_per_veh')} {kpis.isComparing ? `(${selectedYear} vs ${comparisonYear})` : `(${selectedYear})`}
                                </span>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    {t('unit_jd')}
                                </span>
                            </h4>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {kpis.isComparing ? (
                                        <BarChart data={vehicleYoYCostData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                                formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Bar dataKey="current" name={`${selectedYear} (${t('unit_jd')})`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="comparison" name={`${comparisonYear} (${t('unit_jd')})`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <BarChart data={vehicleCostChartData.slice(0, 15)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                                formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                            />
                                            <Bar dataKey="cost" name={t('unit_jd')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Fuel Cost Over Time */}
                        <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                                    {t('chart_fuel_over_time')}
                                </span>
                                {kpis.isComparing && (
                                    <span className="text-xs font-semibold text-slate-400">
                                        {selectedYear} vs {comparisonYear}
                                    </span>
                                )}
                            </h4>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timeCostChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                            formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                        />
                                        {kpis.isComparing && (
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        )}
                                        <Line
                                            type="monotone"
                                            dataKey="current"
                                            name={`${selectedYear} (${t('unit_jd')})`}
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            dot={{r: 4}}
                                            activeDot={{r: 6}}
                                        />
                                        {kpis.isComparing && (
                                            <Line
                                                type="monotone"
                                                dataKey="comparison"
                                                name={`${comparisonYear} (${t('unit_jd')})`}
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{r: 3}}
                                                activeDot={{r: 5}}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Row: Top 5 Vehicles (Liters vs Cost) & Smart Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                {/* Top 5 Vehicles by Liters & Cost */}
                <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                            {t('chart_top_5_fuel_liters')} ({selectedYear})
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {t('unit_liters')}
                        </span>
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top5LitersVehicles} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                    formatter={(val: number) => formatNumber(val) + ' ' + t('unit_liters')}
                                />
                                <Bar dataKey="liters" radius={[0, 4, 4, 0]}>
                                    {top5LitersVehicles.map((entry, index) => (
                                        <Cell key={`cell-top-liters-${index}`} fill={LITERS_COLORS[index % LITERS_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Smart Analysis / Fuel Consumption Summary */}
                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between">
                    <div>
                        <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                            <span className="bg-white/10 p-2 rounded-lg">🧠</span>
                            {t('lbl_smart_fuel_analysis')}
                        </h4>

                        <div className="space-y-5">
                            {highFuelVehicles.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                                    <div className="text-amber-400 text-xs font-black uppercase mb-2">⚠️ {t('lbl_high_cost_alert')}</div>
                                    <div className="text-sm text-slate-300">
                                        {t('msg_high_fuel_vehicles')}: {highFuelVehicles.map(v => v.name).join(', ')}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <div className="text-emerald-400 text-xs font-black uppercase mb-3 flex items-center justify-between">
                                    <span>🛢️ {t('chart_top_5_fuel_liters')}</span>
                                    <span className="text-[10px] text-slate-400">الاستهلاك والأنشطة</span>
                                </div>
                                <div className="space-y-3">
                                    {vehicleLitersChartData.slice(0, 4).map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="text-slate-200 font-semibold">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-emerald-400">{formatNumber(item.liters)} {t('unit_liters')}</div>
                                                <div className="text-[10px] text-slate-400">{formatNumber(item.cost)} {t('unit_jd')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-400 italic mt-6 border-t border-white/10 pt-3">
                        💡 {t('lbl_fuel_liters_advantage')}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default FuelAnalysisSection;
