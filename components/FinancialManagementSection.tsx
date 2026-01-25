
import React, { useMemo, useRef, useState } from 'react';
import { Worker, VehicleTableData, AdditionalCost, Revenue } from '../types';
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
    revenues: Revenue[];
    selectedYear: string;
    comparisonYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#4f46e5', '#ec4899', '#06b6d4'];
const REV_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const FinancialManagementSection: React.FC<FinancialManagementSectionProps> = ({ 
    workers, vehicleData, additionalCosts, revenues, selectedYear, comparisonYear, filters 
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<'comparison' | 'expenses' | 'revenues'>('comparison');

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

    const financialStats = useMemo(() => {
        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        
        // Expenses Calculation
        const totalSalaries = workers.reduce((sum, w) => sum + (w.salary / 12) * monthsCount, 0);
        const totalFuel = vehicleData.reduce((sum, v) => sum + v.fuel, 0);
        const totalMaint = vehicleData.reduce((sum, v) => sum + v.maint, 0);
        const totalTons = vehicleData.reduce((sum, v) => sum + v.tons, 0);
        const extrasTotal = currentYearExtras.insurance + currentYearExtras.clothing + currentYearExtras.cleaning + currentYearExtras.containers;
        const grandTotalExpenses = totalSalaries + totalFuel + totalMaint + extrasTotal;

        // Revenue Calculation
        const currentYearRevenues = revenues.filter(r => r.year === selectedYear);
        const hhFees = currentYearRevenues.reduce((s, r) => s + r.hhFees, 0);
        const commercialFees = currentYearRevenues.reduce((s, r) => s + r.commercialFees, 0);
        const recyclingRevenue = currentYearRevenues.reduce((s, r) => s + r.recyclingRevenue, 0);
        const totalRevenue = hhFees + commercialFees + recyclingRevenue;

        const costRecovery = grandTotalExpenses > 0 ? (totalRevenue / grandTotalExpenses) * 100 : 0;
        const costPerTon = totalTons > 0 ? grandTotalExpenses / totalTons : 0;

        // Comparisons
        const compYearRevenues = revenues.filter(r => r.year === comparisonYear);
        const totalCompRevenue = compYearRevenues.reduce((s, r) => s + (r.hhFees + r.commercialFees + r.recyclingRevenue), 0);

        // Chart Data
        const expenseAllocation = [
            { name: t('th_total_salaries'), value: totalSalaries },
            { name: t('kpi_fuel_cost'), value: totalFuel },
            { name: t('kpi_maint_cost'), value: totalMaint },
            { name: t('th_insurance'), value: currentYearExtras.insurance },
            { name: t('th_clothing'), value: currentYearExtras.clothing },
            { name: t('th_cleaning'), value: currentYearExtras.cleaning },
            { name: t('th_containers'), value: currentYearExtras.containers }
        ].filter(item => item.value > 0);

        const revenueAllocation = [
            { name: t('th_hh_fees'), value: hhFees },
            { name: t('th_commercial_fees'), value: commercialFees },
            { name: t('th_recycling_revenue'), value: recyclingRevenue }
        ].filter(item => item.value > 0);

        return {
            totalSalaries, totalFuel, totalMaint, extrasTotal, grandTotalExpenses,
            hhFees, commercialFees, recyclingRevenue, totalRevenue,
            costRecovery, costPerTon, totalCompRevenue,
            expenseAllocation, revenueAllocation, totalTons
        };
    }, [workers, vehicleData, currentYearExtras, revenues, selectedYear, comparisonYear, t, filters.months]);

    const areaFinancials = useMemo(() => {
        const stats = new Map<string, { exp: number; rev: number; salaries: number; op: number; hh: number; comm: number; rec: number }>();
        
        // 1. Operational Expenses
        vehicleData.forEach(v => {
            const area = v.area || 'غير محدد';
            const current = stats.get(area) || { exp: 0, rev: 0, salaries: 0, op: 0, hh: 0, comm: 0, rec: 0 };
            current.op += (v.fuel + v.maint);
            current.exp += (v.fuel + v.maint);
            stats.set(area, current);
        });

        // 2. Salaries
        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        workers.forEach(w => {
            const area = w.area || 'غير محدد';
            const current = stats.get(area) || { exp: 0, rev: 0, salaries: 0, op: 0, hh: 0, comm: 0, rec: 0 };
            const salary = (w.salary / 12) * monthsCount;
            current.salaries += salary;
            current.exp += salary;
            stats.set(area, current);
        });

        // 3. Revenues
        revenues.filter(r => r.year === selectedYear).forEach(r => {
            const area = r.area || 'غير محدد';
            const current = stats.get(area) || { exp: 0, rev: 0, salaries: 0, op: 0, hh: 0, comm: 0, rec: 0 };
            current.hh += r.hhFees;
            current.comm += r.commercialFees;
            current.rec += r.recyclingRevenue;
            current.rev += (r.hhFees + r.commercialFees + r.recyclingRevenue);
            stats.set(area, current);
        });

        return Array.from(stats.entries()).map(([area, data]) => ({
            name: area,
            displayName: areaMapping[area] || area,
            ...data,
            balance: data.rev - data.exp,
            recovery: data.exp > 0 ? (data.rev / data.exp) * 100 : 0
        })).sort((a, b) => b.exp - a.exp);
    }, [workers, vehicleData, revenues, selectedYear, t, filters.months]);

    const formatCurrency = (val: number) => formatNumber(Math.round(val)) + ' ' + t('unit_jd');

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Consolidated_Financial_Management_${selectedYear}`);
    };

    return (
        <CollapsibleSection title={t('sec_financial_mgmt')}>
            <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button 
                        onClick={() => setViewMode('comparison')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${viewMode === 'comparison' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        المقارنة المالية الشاملة
                    </button>
                    <button 
                        onClick={() => setViewMode('expenses')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${viewMode === 'expenses' ? 'bg-white dark:bg-slate-700 shadow-md text-red-600 dark:text-red-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        تحليل المصاريف
                    </button>
                    <button 
                        onClick={() => setViewMode('revenues')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${viewMode === 'revenues' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        تحليل الإيرادات
                    </button>
                </div>
                <ExportDropdown 
                    onExportPdf={() => printTable(tableContainerRef, t('sec_financial_mgmt'), filters, t, language)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Financial_Consolidated_Export`)}
                />
            </div>

            {/* Comprehensive Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-10">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-7 rounded-[2.5rem] shadow-xl text-white transform transition-transform hover:scale-105">
                    <div className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest text-right">إجمالي المصاريف</div>
                    <div className="text-2xl font-black">{formatCurrency(financialStats.grandTotalExpenses)}</div>
                    <div className="text-[10px] mt-2 text-slate-500 font-bold">لإجمالي {formatNumber(financialStats.totalTons)} طن</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-7 rounded-[2.5rem] shadow-xl text-white transform transition-transform hover:scale-105">
                    <div className="text-blue-200 text-[10px] font-black mb-2 uppercase tracking-widest text-right">إجمالي الإيرادات</div>
                    <div className="text-2xl font-black">{formatCurrency(financialStats.totalRevenue)}</div>
                    <div className="text-[10px] mt-2 text-blue-200/60 font-bold">بمعدل {formatNumber(financialStats.costRecovery, 1)}% استرداد</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-lg border-b-8 border-indigo-500 transition-all hover:-translate-y-2">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">نسبة الاسترداد</div>
                    <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{formatNumber(financialStats.costRecovery, 1)}%</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-lg border-b-8 border-red-500 transition-all hover:-translate-y-2">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">تكلفة الطن الكلية</div>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{formatNumber(financialStats.costPerTon, 1)} <span className="text-xs font-bold">{t('unit_jd')}</span></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-lg border-b-8 border-emerald-500 transition-all hover:-translate-y-2">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-2 uppercase text-right">صافي المركز المالي</div>
                    <div className={`text-2xl font-black ${financialStats.totalRevenue - financialStats.grandTotalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(financialStats.totalRevenue - financialStats.grandTotalExpenses)}
                    </div>
                </div>
            </div>

            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                {/* Expense Allocation View */}
                <div className={`bg-white dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-500 ${viewMode === 'revenues' ? 'opacity-40 grayscale' : 'scale-100'}`}>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                         <span className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full font-black uppercase tracking-widest">Expenses Breakdown</span>
                         <span>هيكل المصاريف لعام {selectedYear}</span>
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialStats.expenseAllocation}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {financialStats.expenseAllocation.map((entry, index) => (
                                        <Cell key={`exp-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', color: isDark ? '#fff' : '#000', textAlign: 'right' }}
                                    formatter={(val: number) => formatCurrency(val)} 
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: axisColor, paddingLeft: '20px', fontSize: '11px', fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Allocation View */}
                <div className={`bg-white dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-500 ${viewMode === 'expenses' ? 'opacity-40 grayscale' : 'scale-100'}`}>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center justify-between">
                        <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-black uppercase tracking-widest">Revenue Streams</span>
                        <span>مصادر الدخل لعام {selectedYear}</span>
                    </h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialStats.revenueAllocation}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {financialStats.revenueAllocation.map((entry, index) => (
                                        <Cell key={`rev-${index}`} fill={REV_COLORS[index % REV_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', color: isDark ? '#fff' : '#000', textAlign: 'right' }}
                                    formatter={(val: number) => formatCurrency(val)} 
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: axisColor, paddingLeft: '20px', fontSize: '11px', fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Consolidated Performance Comparison (Bar Chart) */}
            <div className="bg-white dark:bg-slate-800/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-10">
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-8 text-right flex items-center gap-3 justify-end">
                    <span>مقارنة المصاريف مقابل الإيرادات لكل منطقة</span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                </h4>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={areaFinancials}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="displayName" tick={{fontSize: 11, fontWeight: 800, fill: axisColor}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                cursor={{fill: isDark ? '#334155' : '#f8fafc'}}
                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', color: isDark ? '#fff' : '#000', textAlign: 'right' }}
                                formatter={(val: number) => formatCurrency(val)} 
                            />
                            <Legend wrapperStyle={{paddingTop: '30px', fontWeight: 700}} />
                            <Bar dataKey="exp" name="إجمالي المصاريف" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={35} />
                            <Bar dataKey="rev" name="إجمالي الإيرادات" fill="#10b981" radius={[10, 10, 0, 0]} barSize={35} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Advanced Consolidated Financial Table */}
            <div className="overflow-x-auto rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-xl mb-12" ref={tableContainerRef}>
                <table className="w-full text-[11px] text-center border-collapse bg-white dark:bg-slate-900 transition-colors">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase text-right pr-12">{t('th_area')}</th>
                            <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase">المصاريف الكلية</th>
                            <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase">الإيرادات المحصلة</th>
                            <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase">الصافي الربحي</th>
                            <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase">كفاءة الاسترداد (%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {areaFinancials.map((area, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200 group">
                                <td className="p-5 font-black text-slate-800 dark:text-slate-200 text-right pr-12 group-hover:text-indigo-600">{area.displayName}</td>
                                <td className="p-5 text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(area.exp)}</td>
                                <td className="p-5 text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(area.rev)}</td>
                                <td className={`p-5 font-black ${area.balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                    {formatCurrency(area.balance)}
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${area.recovery >= 100 ? 'bg-emerald-500' : area.recovery > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.min(area.recovery, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-black w-10 text-slate-700 dark:text-slate-300">{formatNumber(area.recovery, 0)}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-900 dark:bg-black font-black text-white border-t-4 border-indigo-500">
                        <tr>
                            <td className="p-6 text-right pr-12 uppercase tracking-widest">إجمالي الحسابات المالية لعام {selectedYear}</td>
                            <td className="p-6 text-rose-300">{formatCurrency(financialStats.grandTotalExpenses)}</td>
                            <td className="p-6 text-emerald-300">{formatCurrency(financialStats.totalRevenue)}</td>
                            <td className="p-6 text-indigo-200">{formatCurrency(financialStats.totalRevenue - financialStats.grandTotalExpenses)}</td>
                            <td className="p-6 text-amber-300">{formatNumber(financialStats.costRecovery, 1)}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Non-Operational Costs Integration (Additional Costs) */}
            <div className="bg-slate-950 p-12 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                        <h4 className="text-2xl font-black flex items-center gap-4">
                            <span className="bg-white/10 p-4 rounded-[1.5rem] shadow-xl border border-white/10">🧾</span>
                            التكاليف الإدارية وغير التشغيلية
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="px-8 py-3 bg-white/5 rounded-2xl text-xs font-black border border-white/10 backdrop-blur-sm">
                                إجمالي الإضافات: <span className="text-indigo-400 text-lg ml-2">{formatCurrency(financialStats.extrasTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: t('th_insurance'), val: currentYearExtras.insurance, color: 'text-blue-400', bg: 'bg-blue-400/5' },
                            { label: t('th_clothing'), val: currentYearExtras.clothing, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
                            { label: t('th_cleaning'), val: currentYearExtras.cleaning, color: 'text-amber-400', bg: 'bg-amber-400/5' },
                            { label: t('th_containers'), val: currentYearExtras.containers, color: 'text-pink-400', bg: 'bg-pink-400/5' }
                        ].map((item, i) => (
                            <div key={i} className={`${item.bg} p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 group cursor-default`}>
                                <div className={`${item.color} text-[10px] font-black uppercase mb-3 tracking-[0.2em] group-hover:translate-x-1 transition-transform text-right`}>{item.label}</div>
                                <div className="text-3xl font-black">{formatCurrency(item.val)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default FinancialManagementSection;
