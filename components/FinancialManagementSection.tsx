
import React, { useMemo, useRef } from 'react';
import { Worker, VehicleTableData, AdditionalCost } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface FinancialManagementSectionProps {
    workers: Worker[];
    vehicleData: VehicleTableData[];
    additionalCosts: AdditionalCost[];
    selectedYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#4f46e5', '#ec4899', '#06b6d4'];

const FinancialManagementSection: React.FC<FinancialManagementSectionProps> = ({ workers, vehicleData, additionalCosts, selectedYear, filters }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const tableContainerRef = useRef<HTMLDivElement>(null);

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

    const currentYearExtras = useMemo(() => {
        return additionalCosts.find(c => c.year === selectedYear) || { insurance: 0, clothing: 0, cleaning: 0, containers: 0, year: selectedYear };
    }, [additionalCosts, selectedYear]);

    const financialSummary = useMemo(() => {
        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        const totalSalaries = workers.reduce((sum, w) => sum + (w.salary / 12) * monthsCount, 0);
        
        const totalFuel = vehicleData.reduce((sum, v) => sum + v.fuel, 0);
        const totalMaint = vehicleData.reduce((sum, v) => sum + v.maint, 0);
        const totalTons = vehicleData.reduce((sum, v) => sum + v.tons, 0);
        
        const extrasTotal = currentYearExtras.insurance + currentYearExtras.clothing + currentYearExtras.cleaning + currentYearExtras.containers;
        const grandTotal = totalSalaries + totalFuel + totalMaint + extrasTotal;
        const costPerTonOverall = totalTons > 0 ? grandTotal / totalTons : 0;

        return {
            totalSalaries,
            totalFuel,
            totalMaint,
            extrasTotal,
            grandTotal,
            totalTons,
            costPerTonOverall,
            allocation: [
                { name: t('th_total_salaries'), value: totalSalaries },
                { name: t('kpi_fuel_cost'), value: totalFuel },
                { name: t('kpi_maint_cost'), value: totalMaint },
                { name: t('th_insurance'), value: currentYearExtras.insurance },
                { name: t('th_clothing'), value: currentYearExtras.clothing },
                { name: t('th_cleaning'), value: currentYearExtras.cleaning },
                { name: t('th_containers'), value: currentYearExtras.containers }
            ].filter(item => item.value > 0)
        };
    }, [workers, vehicleData, currentYearExtras, t, filters.months]);

    const areaFinancials = useMemo(() => {
        const areaMap = new Map<string, { fuel: number; maint: number; tons: number }>();
        
        vehicleData.forEach(v => {
            const area = v.area || 'غير محدد';
            const current = areaMap.get(area) || { fuel: 0, maint: 0, tons: 0 };
            areaMap.set(area, {
                fuel: current.fuel + v.fuel,
                maint: current.maint + v.maint,
                tons: current.tons + v.tons
            });
        });

        const areaSalaries = new Map<string, number>();
        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        
        workers.forEach(w => {
            const area = w.area || 'غير محدد';
            const salaryForPeriod = (w.salary / 12) * monthsCount;
            areaSalaries.set(area, (areaSalaries.get(area) || 0) + salaryForPeriod);
        });

        const allAreas = Array.from(new Set([...areaMap.keys(), ...areaSalaries.keys()]));

        return allAreas.map(area => {
            const oper = areaMap.get(area) || { fuel: 0, maint: 0, tons: 0 };
            const salaries = areaSalaries.get(area) || 0;
            const total = oper.fuel + oper.maint + salaries;
            return {
                name: area,
                displayName: areaMapping[area] || area,
                salaries,
                operational: oper.fuel + oper.maint,
                total,
                efficiency: oper.tons > 0 ? total / oper.tons : 0
            };
        }).sort((a, b) => b.total - a.total);
    }, [workers, vehicleData, t, filters.months]);

    const formatCurrency = (val: number) => formatNumber(Math.round(val)) + ' ' + t('unit_jd');

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Consolidated_Financial_Report`);
    };

    return (
        <CollapsibleSection title={t('sec_financial_mgmt')}>
            <div className="flex justify-end items-center gap-4 mb-8">
                 <ExportDropdown 
                    onExportPdf={() => printTable(tableContainerRef, t('sec_financial_mgmt'), filters, t, language)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Financial_Consolidated_Export`)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl shadow-lg text-white">
                    <div className="text-indigo-100 text-[10px] font-black mb-2 uppercase opacity-80 text-right">{t('kpi_total_annual_expenses')}</div>
                    <div className="text-2xl font-black">{formatCurrency(financialSummary.grandTotal)}</div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border-b-4 border-blue-500 transition-colors">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">{t('kpi_cost_per_ton')}</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatNumber(financialSummary.costPerTonOverall, 1)} <span className="text-[10px] font-normal text-slate-400">{t('unit_jd')}/{t('unit_ton')}</span></div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border-b-4 border-emerald-500 transition-colors">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">{t('th_total_salaries')}</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(financialSummary.totalSalaries)}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border-b-4 border-amber-500 transition-colors">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">{t('th_operational_cost')}</div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(financialSummary.totalFuel + financialSummary.totalMaint)}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border-b-4 border-pink-500 transition-colors">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">{t('th_total_extra')}</div>
                    <div className="text-2xl font-black text-pink-600 dark:text-pink-400">{formatCurrency(financialSummary.extrasTotal)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 text-right">هيكل التكاليف الموحد لعام {selectedYear}</h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialSummary.allocation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {financialSummary.allocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000', textAlign: 'right' }}
                                    formatter={(val: number) => formatCurrency(val)} 
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: axisColor, paddingLeft: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 text-right">تحليل الميزانية حسب المنطقة (الرواتب + التشغيل)</h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={areaFinancials.slice(0, 7)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="displayName" type="category" tick={{fontSize: 10, fontWeight: 700, fill: axisColor}} width={80} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                    formatter={(val: number) => formatCurrency(val)} 
                                />
                                <Bar dataKey="salaries" name={t('th_total_salaries')} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={25} />
                                <Bar dataKey="operational" name={t('th_operational_cost')} stackId="a" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mb-10" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase text-right pr-10">{t('th_area')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_total_salaries')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_operational_cost')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_budget')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_cost_ton')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {areaFinancials.map((area, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="p-4 font-bold text-slate-800 dark:text-slate-200 text-right pr-10">{area.displayName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-400">{formatCurrency(area.salaries)}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-400">{formatCurrency(area.operational)}</td>
                                <td className="p-4 font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(area.total)}</td>
                                <td className="p-4">
                                    <span className={`font-black px-3 py-1 rounded-full text-xs ${area.efficiency > 50 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {formatNumber(area.efficiency, 1)} {t('unit_jd')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <h4 className="text-xl font-black mb-8 flex items-center gap-3">
                        <span className="bg-white/20 p-2 rounded-2xl">🧾</span>
                        {t('sec_additional_costs')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-blue-300 text-[10px] font-black uppercase mb-2 tracking-widest">{t('th_insurance')}</div>
                            <div className="text-3xl font-black">{formatCurrency(currentYearExtras.insurance)}</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-emerald-300 text-[10px] font-black uppercase mb-2 tracking-widest">{t('th_clothing')}</div>
                            <div className="text-3xl font-black">{formatCurrency(currentYearExtras.clothing)}</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-amber-300 text-[10px] font-black uppercase mb-2 tracking-widest">{t('th_cleaning')}</div>
                            <div className="text-3xl font-black">{formatCurrency(currentYearExtras.cleaning)}</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-pink-300 text-[10px] font-black uppercase mb-2 tracking-widest">{t('th_containers')}</div>
                            <div className="text-3xl font-black">{formatCurrency(currentYearExtras.containers)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default FinancialManagementSection;
