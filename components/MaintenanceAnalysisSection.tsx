import React, { useMemo } from 'react';
import { MaintenanceRecord } from '../types';
import { formatNumber } from '../services/dataService';
import CollapsibleSection from './CollapsibleSection';
import KpiCard from './KpiCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { MONTHS_ORDER } from '../constants';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line, Cell
} from 'recharts';

interface MaintenanceAnalysisSectionProps {
    maintRecords: MaintenanceRecord[];
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
    comparisonYear?: string;
    onComparisonYearChange?: (year: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const MaintenanceAnalysisSection: React.FC<MaintenanceAnalysisSectionProps> = ({
    maintRecords, filters, selectedYear, comparisonYear, onComparisonYearChange
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const availableYears = useMemo(() => {
        return [...new Set(maintRecords.map(r => r['السنة']).filter(Boolean))].sort().reverse();
    }, [maintRecords]);

    const filteredData = useMemo(() => {
        return maintRecords.filter(r => {
            const matchYear = r['السنة'] === selectedYear;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            const matchMonth = filters.months.size === 0 || filters.months.has(r['الشهر']);
            return matchYear && matchVehicle && matchMonth;
        });
    }, [maintRecords, filters, selectedYear]);

    // Active months set for the same period comparison
    const activeMonths = useMemo(() => {
        if (filters.months.size > 0) {
            return filters.months;
        }
        const set = new Set<string>();
        filteredData.forEach(r => {
            if (r['الشهر']) set.add(r['الشهر']);
        });
        return set;
    }, [filters.months, filteredData]);

    const comparisonFilteredData = useMemo(() => {
        if (!comparisonYear || comparisonYear === selectedYear) return [];
        return maintRecords.filter(r => {
            const matchYear = r['السنة'] === comparisonYear;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            const matchMonth = activeMonths.size === 0 || activeMonths.has(r['الشهر']);
            return matchYear && matchVehicle && matchMonth;
        });
    }, [maintRecords, filters.vehicles, activeMonths, comparisonYear, selectedYear]);

    const kpis = useMemo(() => {
        const totalCost = filteredData.reduce((sum, r) => sum + r['المبلغ'], 0);
        const operationsCount = filteredData.length;
        
        const vehicleCosts = new Map<string, number>();
        filteredData.forEach(r => {
            const v = r['رقم المركبة'];
            vehicleCosts.set(v, (vehicleCosts.get(v) || 0) + r['المبلغ']);
        });

        const avgCostPerVehicle = vehicleCosts.size > 0 ? totalCost / vehicleCosts.size : 0;
        
        let topVehicle = "—";
        let topCost = 0;
        vehicleCosts.forEach((cost, v) => {
            if (cost > topCost) {
                topCost = cost;
                topVehicle = v;
            }
        });

        let lowestVehicle = "—";
        let lowestCost = Infinity;
        vehicleCosts.forEach((cost, v) => {
            if (cost < lowestCost) {
                lowestCost = cost;
                lowestVehicle = v;
            }
        });
        if (lowestCost === Infinity) lowestCost = 0;

        // Comparison KPIs
        const compTotalCost = comparisonFilteredData.reduce((sum, r) => sum + r['المبلغ'], 0);
        const compOperationsCount = comparisonFilteredData.length;
        const compVehicleCosts = new Map<string, number>();
        comparisonFilteredData.forEach(r => {
            const v = r['رقم المركبة'];
            compVehicleCosts.set(v, (compVehicleCosts.get(v) || 0) + r['المبلغ']);
        });
        const compAvgCostPerVehicle = compVehicleCosts.size > 0 ? compTotalCost / compVehicleCosts.size : 0;

        const costDiff = totalCost - compTotalCost;
        const costDiffPercent = compTotalCost > 0 ? ((totalCost - compTotalCost) / compTotalCost) * 100 : 0;

        return {
            totalCost,
            avgCostPerVehicle,
            topVehicle: topCost > 0 ? `${topVehicle} (${formatNumber(topCost)} ${t('unit_jd')})` : "—",
            lowestVehicle: lowestCost < Infinity && lowestVehicle !== "—" ? `${lowestVehicle} (${formatNumber(lowestCost)} ${t('unit_jd')})` : "—",
            operationsCount,
            compTotalCost,
            compAvgCostPerVehicle,
            compOperationsCount,
            costDiff,
            costDiffPercent,
            isComparing: !!comparisonYear && comparisonYear !== selectedYear
        };
    }, [filteredData, comparisonFilteredData, comparisonYear, selectedYear, t]);

    const vehicleChartData = useMemo(() => {
        const vehicleMap = new Map<string, number>();
        filteredData.forEach(r => {
            const v = r['رقم المركبة'];
            vehicleMap.set(v, (vehicleMap.get(v) || 0) + r['المبلغ']);
        });

        return Array.from(vehicleMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const top5Vehicles = useMemo(() => vehicleChartData.slice(0, 5), [vehicleChartData]);

    const timeChartData = useMemo(() => {
        const monthMapCurrent = new Map<string, number>();
        const monthMapComp = new Map<string, number>();

        const monthsToInclude = filters.months.size > 0
            ? MONTHS_ORDER.filter(m => filters.months.has(m))
            : MONTHS_ORDER;

        monthsToInclude.forEach(m => {
            monthMapCurrent.set(m, 0);
            monthMapComp.set(m, 0);
        });

        filteredData.forEach(r => {
            const m = r['الشهر'];
            if (monthMapCurrent.has(m)) {
                monthMapCurrent.set(m, (monthMapCurrent.get(m) || 0) + r['المبلغ']);
            }
        });

        comparisonFilteredData.forEach(r => {
            const m = r['الشهر'];
            if (monthMapComp.has(m)) {
                monthMapComp.set(m, (monthMapComp.get(m) || 0) + r['المبلغ']);
            }
        });

        return monthsToInclude.map(m => ({
            name: t(`month_${m}`),
            current: monthMapCurrent.get(m) || 0,
            comparison: monthMapComp.get(m) || 0
        }));
    }, [filteredData, comparisonFilteredData, filters.months, t]);

    const vehicleYoYData = useMemo(() => {
        const mapCurrent = new Map<string, number>();
        const mapComp = new Map<string, number>();

        filteredData.forEach(r => {
            const v = r['رقم المركبة'];
            mapCurrent.set(v, (mapCurrent.get(v) || 0) + r['المبلغ']);
        });

        comparisonFilteredData.forEach(r => {
            const v = r['رقم المركبة'];
            mapComp.set(v, (mapComp.get(v) || 0) + r['المبلغ']);
        });

        const allVehicles = Array.from(new Set([...mapCurrent.keys(), ...mapComp.keys()]));
        
        return allVehicles.map(v => ({
            name: v,
            current: mapCurrent.get(v) || 0,
            comparison: mapComp.get(v) || 0
        })).sort((a, b) => b.current - a.current).slice(0, 10);
    }, [filteredData, comparisonFilteredData]);

    const efficiencyData = useMemo(() => {
        const vehicleStats = new Map<string, { cost: number; count: number }>();
        filteredData.forEach(r => {
            const v = r['رقم المركبة'];
            const current = vehicleStats.get(v) || { cost: 0, count: 0 };
            vehicleStats.set(v, { cost: current.cost + r['المبلغ'], count: current.count + 1 });
        });

        return Array.from(vehicleStats.entries()).map(([name, stats]) => ({
            name,
            cost: stats.cost,
            count: stats.count,
            avgPerOp: stats.count > 0 ? stats.cost / stats.count : 0
        })).sort((a, b) => b.cost - a.cost);
    }, [filteredData]);

    const highCostVehicles = useMemo(() => {
        if (efficiencyData.length === 0) return [];
        const avgCost = efficiencyData.reduce((sum, d) => sum + d.cost, 0) / efficiencyData.length;
        return efficiencyData.filter(d => d.cost > avgCost * 1.5);
    }, [efficiencyData]);

    return (
        <CollapsibleSection title={t('sec_maint_analysis')}>
            {/* Year Comparison Control Toolbar */}
            <div className="bg-white dark:bg-slate-800/80 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xl">⚖️</span>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {t('maint_yoy_comparison')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('lbl_same_period_note')}
                        </p>
                    </div>
                </div>

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
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 md:p-6 rounded-3xl shadow-lg mb-8 border border-indigo-500/20">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-indigo-500/20 p-2.5 rounded-2xl text-2xl">📊</span>
                            <div>
                                <span className="text-xs uppercase tracking-wider text-indigo-300 font-extrabold">
                                    {t('maint_yoy_comparison')} ({selectedYear} vs {comparisonYear})
                                </span>
                                <h3 className="text-lg md:text-xl font-black">
                                    {formatNumber(kpis.totalCost)} {t('unit_jd')} 
                                    <span className="text-xs font-normal text-slate-300 mx-2">مقابل</span>
                                    {formatNumber(kpis.compTotalCost)} {t('unit_jd')}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 ${
                                kpis.costDiff <= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                                <span>{kpis.costDiff <= 0 ? '📉' : '📈'}</span>
                                <span>
                                    {kpis.costDiff <= 0 ? t('lbl_maint_decrease') : t('lbl_maint_increase')}: 
                                    {' '}{formatNumber(Math.abs(kpis.costDiff))} {t('unit_jd')}
                                    ({kpis.costDiffPercent > 0 ? '+' : ''}{kpis.costDiffPercent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                        <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-slate-400 block mb-1">{t('kpi_total_maint_cost')}</span>
                            <span className="font-bold text-white text-sm">
                                {selectedYear}: {formatNumber(kpis.totalCost)} {t('unit_jd')}
                            </span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compTotalCost)} {t('unit_jd')}
                            </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-slate-400 block mb-1">{t('kpi_avg_maint_veh')}</span>
                            <span className="font-bold text-white text-sm">
                                {selectedYear}: {formatNumber(kpis.avgCostPerVehicle)} {t('unit_jd')}
                            </span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compAvgCostPerVehicle)} {t('unit_jd')}
                            </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-slate-400 block mb-1">{t('kpi_maint_ops_count')}</span>
                            <span className="font-bold text-white text-sm">
                                {selectedYear}: {formatNumber(kpis.operationsCount)} {t('unit_ops')}
                            </span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                                {comparisonYear}: {formatNumber(kpis.compOperationsCount)} {t('unit_ops')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div id="maint-kpi-grid" className="kpi-section">
                <h3 className="hidden">{t('sec_maint_analysis')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-8">
                    <KpiCard 
                        value={formatNumber(kpis.totalCost) + ' ' + t('unit_jd')} 
                        label={t('kpi_total_maint_cost')} 
                        icon="🔧" 
                        color="text-red-600" 
                    />
                    <KpiCard 
                        value={formatNumber(kpis.avgCostPerVehicle) + ' ' + t('unit_jd')} 
                        label={t('kpi_avg_maint_veh')} 
                        icon="📊" 
                        color="text-orange-600" 
                    />
                    <KpiCard 
                        value={kpis.topVehicle} 
                        label={t('kpi_top_maint_veh')} 
                        icon="🏆" 
                        color="text-purple-600" 
                    />
                    <KpiCard 
                        value={kpis.lowestVehicle} 
                        label={t('kpi_lowest_maint_veh')} 
                        icon="🟢" 
                        color="text-emerald-600" 
                    />
                    <KpiCard 
                        value={formatNumber(kpis.operationsCount)} 
                        label={t('kpi_maint_ops_count')} 
                        icon="🛠️" 
                        color="text-blue-600" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-8">
                {/* Maintenance Cost per Vehicle */}
                <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            {t('chart_maint_per_veh')} {kpis.isComparing ? `(${selectedYear} vs ${comparisonYear})` : `(${selectedYear})`}
                        </span>
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {kpis.isComparing ? (
                                <BarChart data={vehicleYoYData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                        formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="current" name={selectedYear} fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="comparison" name={comparisonYear} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <BarChart data={vehicleChartData.slice(0, 15)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                        formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                    />
                                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Maintenance Cost Over Time */}
                <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {t('chart_maint_over_time')}
                        </span>
                        {kpis.isComparing && (
                            <span className="text-xs font-semibold text-slate-400">
                                {selectedYear} vs {comparisonYear}
                            </span>
                        )}
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeChartData}>
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
                                    name={selectedYear} 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    dot={{r: 4}} 
                                    activeDot={{r: 6}} 
                                />
                                {kpis.isComparing && (
                                    <Line 
                                        type="monotone" 
                                        dataKey="comparison" 
                                        name={comparisonYear} 
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                {/* Top 5 Vehicles by Maintenance Cost */}
                <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        {t('chart_top_5_maint')} ({selectedYear})
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top5Vehicles} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                    formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {top5Vehicles.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Smart Analysis / Efficiency */}
                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
                    <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                        <span className="bg-white/10 p-2 rounded-lg">🧠</span>
                        {t('lbl_smart_maint_analysis')}
                    </h4>
                    
                    <div className="space-y-6">
                        {highCostVehicles.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                                <div className="text-red-400 text-xs font-black uppercase mb-2">⚠️ {t('lbl_high_cost_alert')}</div>
                                <div className="text-sm text-slate-300">
                                    {t('msg_high_cost_vehicles')}: {highCostVehicles.map(v => v.name).join(', ')}
                                </div>
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <div className="text-indigo-400 text-xs font-black uppercase mb-3">{t('lbl_efficiency_comparison')}</div>
                            <div className="space-y-3">
                                {efficiencyData.slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">{item.name}</span>
                                        <div className="text-right">
                                            <div className="font-black">{formatNumber(item.count)} {t('unit_ops')}</div>
                                            <div className="text-[10px] text-slate-500">{formatNumber(item.avgPerOp)} {t('unit_jd')}/{t('unit_op')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-500 italic">
                            * {t('msg_maint_analysis_note')}
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default MaintenanceAnalysisSection;
