
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
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const MaintenanceAnalysisSection: React.FC<MaintenanceAnalysisSectionProps> = ({
    maintRecords, filters, selectedYear
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const filteredData = useMemo(() => {
        return maintRecords.filter(r => {
            const matchYear = r['السنة'] === selectedYear;
            const matchVehicle = filters.vehicles.size === 0 || filters.vehicles.has(r['رقم المركبة']);
            const matchMonth = filters.months.size === 0 || filters.months.has(r['الشهر']);
            return matchYear && matchVehicle && matchMonth;
        });
    }, [maintRecords, filters, selectedYear]);

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

        return {
            totalCost,
            avgCostPerVehicle,
            topVehicle: topCost > 0 ? `${topVehicle} (${formatNumber(topCost)} ${t('unit_jd')})` : "—",
            operationsCount
        };
    }, [filteredData, t]);

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
        const monthMap = new Map<string, number>();
        // Initialize all months if no month filter is active
        if (filters.months.size === 0) {
            MONTHS_ORDER.forEach(m => monthMap.set(m, 0));
        } else {
            filters.months.forEach(m => monthMap.set(m, 0));
        }

        filteredData.forEach(r => {
            const m = r['الشهر'];
            if (monthMap.has(m)) {
                monthMap.set(m, (monthMap.get(m) || 0) + r['المبلغ']);
            }
        });

        return MONTHS_ORDER
            .filter(m => monthMap.has(m))
            .map(m => ({
                name: t(`month_${m}`),
                value: monthMap.get(m) || 0
            }));
    }, [filteredData, filters.months, t]);

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
            <div id="maint-kpi-grid" className="kpi-section">
                <h3 className="hidden">{t('sec_maint_analysis')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {t('chart_maint_per_veh')}
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Maintenance Cost Over Time */}
                <div className="bg-white dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {t('chart_maint_over_time')}
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
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
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
                        {t('chart_top_5_maint')}
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
