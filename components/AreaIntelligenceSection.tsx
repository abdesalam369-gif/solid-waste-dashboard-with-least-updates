
import React, { useMemo, useRef, useState } from 'react';
import { Worker, VehicleTableData, Population } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, Cell, ComposedChart, Line, PieChart, Pie
} from 'recharts';

interface AreaIntelligenceSectionProps {
    workers: Worker[];
    vehicleData: VehicleTableData[];
    population: Population[];
    selectedYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const AreaIntelligenceSection: React.FC<AreaIntelligenceSectionProps> = ({ workers, vehicleData, population, selectedYear, filters }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [activeMetric, setActiveMetric] = useState<'tons' | 'budget' | 'efficiency'>('tons');

    const ALLOWED_AREAS = useMemo(() => [
        'الطيبة', 'مؤته', 'المزار', 'العراق', 'الهاشمية', 'سول', 'جعفر'
    ], []);

    const areaMapping: {[key: string]: string} = {
        'الطيبة': t('area_taybeh'),
        'مؤته': t('area_mutah'),
        'مؤتة': t('area_mutah'),
        'المزار': t('area_mazar'),
        'العراق': t('area_iraq'),
        'الهاشمية': t('area_hashimiah'),
        'سول': t('area_sol'),
        'جعفر': t('area_jaffar')
    };

    const areaAnalysis = useMemo(() => {
        const statsMap = new Map<string, any>();

        ALLOWED_AREAS.forEach(area => {
            statsMap.set(area, { 
                name: area, 
                displayName: areaMapping[area] || area,
                tons: 0, 
                trips: 0, 
                fuel: 0, 
                maint: 0, 
                workersCount: 0, 
                salaries: 0,
                population: 0,
                vehicles: new Set<string>() 
            });
        });

        vehicleData.forEach(v => {
            let area = (v.area || '').trim();
            if (area === 'مؤتة') area = 'مؤته'; 

            if (ALLOWED_AREAS.includes(area)) {
                const current = statsMap.get(area);
                current.vehicles.add(v.veh);
                statsMap.set(area, {
                    ...current,
                    tons: current.tons + v.tons,
                    trips: current.trips + v.trips,
                    fuel: current.fuel + v.fuel,
                    maint: current.maint + v.maint,
                });
            }
        });

        workers.forEach(w => {
            let area = (w.area || '').trim();
            if (area === 'مؤتة') area = 'مؤته';

            if (ALLOWED_AREAS.includes(area)) {
                const current = statsMap.get(area);
                statsMap.set(area, {
                    ...current,
                    workersCount: current.workersCount + 1,
                    salaries: current.salaries + w.salary
                });
            }
        });

        population.forEach(p => {
            let area = (p.area || '').trim();
            if (area === 'مؤتة') area = 'مؤته';

            if (ALLOWED_AREAS.includes(area)) {
                const current = statsMap.get(area);
                current.population = p.population;
                statsMap.set(area, current);
            }
        });

        return Array.from(statsMap.values()).map(item => {
            const operationalCost = item.fuel + item.maint;
            const totalBudget = operationalCost + item.salaries;
            const costPerTon = item.tons > 0 ? totalBudget / item.tons : 0;
            const tonsPerWorker = item.tons > 0 && item.workersCount > 0 ? item.tons / item.workersCount : 0;
            const vehiclesCount = item.vehicles.size; 
            
            return {
                ...item,
                value: item.tons, // for pie chart
                operationalCost,
                totalBudget,
                costPerTon,
                tonsPerWorker,
                vehiclesCount
            };
        }).sort((a, b) => b.tons - a.tons);
    }, [workers, vehicleData, population, ALLOWED_AREAS, t]);

    const topArea = useMemo(() => {
        if (!areaAnalysis.length) return null;
        return areaAnalysis.reduce((prev, current) => (prev.tons > current.tons) ? prev : current);
    }, [areaAnalysis]);

    const mostEfficient = useMemo(() => {
        if (!areaAnalysis.length) return null;
        const activeAreas = areaAnalysis.filter(a => a.tons > 1);
        if (activeAreas.length === 0) return null;
        return activeAreas.reduce((prev, current) => (prev.costPerTon < current.costPerTon) ? prev : current);
    }, [areaAnalysis]);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
        if (percent < 0.05) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black pointer-events-none">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Area_Intelligence_Report`);
    };

    return (
        <CollapsibleSection title={t('sec_area_intel')}>
            <div className="flex justify-end items-center gap-4 mb-8">
                 <ExportDropdown 
                    onExportPdf={() => printTable(tableContainerRef, t('sec_area_intel'), filters, t, language)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Area_Intelligence_Consolidated`)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-7 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                    <div className="absolute -left-4 -top-4 text-7xl opacity-20 group-hover:scale-110 transition-transform">🏆</div>
                    <div className="relative z-10">
                        <div className="text-indigo-100 text-[10px] font-black mb-2 uppercase tracking-tighter opacity-80 text-right">{t('kpi_top_weight_veh')}</div>
                        <div className="text-3xl font-black text-right">{topArea?.displayName}</div>
                        <div className="text-indigo-200 font-bold text-sm text-right mt-1">{formatNumber(topArea?.tons || 0)} {t('unit_ton')}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-lg border-b-8 border-emerald-500 transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute -left-6 -top-6 text-7xl opacity-5 group-hover:rotate-12 transition-transform">💡</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase mb-2 text-right">{t('kpi_cost_per_ton')}</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 text-right">{mostEfficient?.displayName || '—'}</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm text-right mt-1">
                        {mostEfficient ? `${formatNumber(mostEfficient.costPerTon, 1)} ${t('unit_jd')}/${t('unit_ton')}` : '—'}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-lg border-b-8 border-amber-500 transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute -left-6 -top-6 text-7xl opacity-5 group-hover:rotate-12 transition-transform">👥</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase mb-2 text-right">{t('th_emp_count')}</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 text-right">
                        {areaAnalysis.reduce((p, c) => (p.workersCount > c.workersCount) ? p : c, areaAnalysis[0])?.displayName}
                    </div>
                    <div className="text-amber-600 dark:text-amber-400 font-bold text-sm text-right mt-1">
                        {areaAnalysis.reduce((p, c) => (p.workersCount > c.workersCount) ? p : c, areaAnalysis[0])?.workersCount} {t('unit_worker')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                {/* Waste Distribution (Previously AreaChartSection) */}
                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm relative">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2 text-right">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        {t('sec_waste_dist')}
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={areaAnalysis} 
                                    cx="50%" cy="50%" 
                                    labelLine={false} 
                                    label={renderCustomizedLabel}
                                    innerRadius={60}
                                    outerRadius={100} 
                                    paddingAngle={2}
                                    dataKey="tons" 
                                    nameKey="displayName"
                                    stroke="none"
                                >
                                    {areaAnalysis.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000', textAlign: 'right' }} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: axisColor, paddingLeft: '20px', fontSize: '11px', fontWeight: '700' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Comparative Analytics (Refined from original) */}
                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm relative">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 text-right">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            المقارنة المعيارية للمناطق
                        </h4>
                        <div className="flex gap-1">
                            <button onClick={() => setActiveMetric('tons')} className={`p-1.5 rounded-lg text-[9px] font-black transition-all ${activeMetric === 'tons' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>أوزان</button>
                            <button onClick={() => setActiveMetric('budget')} className={`p-1.5 rounded-lg text-[9px] font-black transition-all ${activeMetric === 'budget' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>ميزانية</button>
                            <button onClick={() => setActiveMetric('efficiency')} className={`p-1.5 rounded-lg text-[9px] font-black transition-all ${activeMetric === 'efficiency' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>إنتاجية</button>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={areaAnalysis}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="displayName" tick={{fontSize: 9, fontWeight: 700, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{fontSize: 9, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 9, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', color: isDark ? '#fff' : '#000' }} />
                                {activeMetric === 'tons' && (
                                    <>
                                        <Bar yAxisId="left" dataKey="tons" name={t('th_tons')} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Line yAxisId="right" type="monotone" dataKey="trips" name={t('th_trips')} stroke="#f59e0b" strokeWidth={3} dot={{r: 3}} />
                                    </>
                                )}
                                {activeMetric === 'budget' && (
                                    <>
                                        <Bar yAxisId="left" dataKey="totalBudget" name={t('th_budget')} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Line yAxisId="right" type="monotone" dataKey="costPerTon" name={t('th_cost_ton')} stroke="#ef4444" strokeWidth={3} dot={{r: 3}} />
                                    </>
                                )}
                                {activeMetric === 'efficiency' && (
                                    <>
                                        <Bar yAxisId="left" dataKey="tonsPerWorker" name={t('th_avg_load')} fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Line yAxisId="right" type="monotone" dataKey="workersCount" name={t('th_emp_count')} stroke="#3b82f6" strokeWidth={3} dot={{r: 3}} />
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-[10px] md:text-[11px] text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-right pr-10">{t('th_area')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_pop')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_veh_no')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_emp_count')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_tons')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_trips')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_budget')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase">{t('th_cost_ton')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {areaAnalysis.map((area, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 font-black text-slate-800 dark:text-slate-200 text-right pr-10">{area.displayName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">{formatNumber(area.population)}</td>
                                <td className="p-4 font-black text-blue-800 dark:text-blue-300">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                        {area.vehiclesCount}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-black">
                                        {area.workersCount}
                                    </span>
                                </td>
                                <td className="p-4 font-black text-slate-700 dark:text-slate-300">{formatNumber(area.tons, 1)}</td>
                                <td className="p-4 text-slate-500 dark:text-slate-400">{area.trips}</td>
                                <td className="p-4 font-black text-emerald-700 dark:text-emerald-400">
                                    {formatNumber(Math.round(area.totalBudget))} {t('unit_jd')}
                                </td>
                                <td className="p-4">
                                    <div className={`font-black rounded-lg py-1 px-2 ${area.costPerTon > 40 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                        {formatNumber(area.costPerTon, 1)} {t('unit_jd')}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default AreaIntelligenceSection;
