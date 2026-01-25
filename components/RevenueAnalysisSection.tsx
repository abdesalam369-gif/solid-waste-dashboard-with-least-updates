
import React, { useMemo, useRef } from 'react';
import { Revenue } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import KpiCard from './KpiCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface RevenueAnalysisSectionProps {
    revenues: Revenue[];
    selectedYear: string;
    comparisonYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const RevenueAnalysisSection: React.FC<RevenueAnalysisSectionProps> = ({ 
    revenues, selectedYear, comparisonYear, filters 
}) => {
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

    const revenueStats = useMemo(() => {
        const currentData = revenues.filter(r => r.year === selectedYear);
        const compData = comparisonYear ? revenues.filter(r => r.year === comparisonYear) : [];

        const calculateTotal = (data: Revenue[]) => ({
            hh: data.reduce((s, r) => s + r.hhFees, 0),
            commercial: data.reduce((s, r) => s + r.commercialFees, 0),
            recycling: data.reduce((s, r) => s + r.recyclingRevenue, 0),
            total: data.reduce((s, r) => s + (r.hhFees + r.commercialFees + r.recyclingRevenue), 0)
        });

        const current = calculateTotal(currentData);
        const comp = comparisonYear ? calculateTotal(compData) : null;

        // Area breakdown for current year
        const areaMap = new Map<string, number>();
        currentData.forEach(r => {
            if (r.area) {
                const total = r.hhFees + r.commercialFees + r.recyclingRevenue;
                areaMap.set(r.area, (areaMap.get(r.area) || 0) + total);
            }
        });

        const areaDist = Array.from(areaMap.entries()).map(([name, value]) => ({
            name: name,
            displayName: areaMapping[name] || name,
            value
        })).sort((a, b) => b.value - a.value);

        const sourceDist = [
            { name: t('th_hh_fees'), value: current.hh },
            { name: t('th_commercial_fees'), value: current.commercial },
            { name: t('th_recycling_revenue'), value: current.recycling }
        ].filter(v => v.value > 0);

        return { current, comp, areaDist, sourceDist };
    }, [revenues, selectedYear, comparisonYear, t]);

    const formatCurrency = (val: number) => formatNumber(Math.round(val)) + ' ' + t('unit_jd');

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Revenue_Analysis_Report`);
    };

    return (
        <CollapsibleSection title={t('sec_revenue_analysis')}>
            <div className="flex justify-end items-center gap-4 mb-8">
                 <ExportDropdown 
                    onExportPdf={() => printTable(tableContainerRef, t('sec_revenue_analysis'), filters, t, language)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `Revenue_Analysis_Export`)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <KpiCard 
                    value={formatCurrency(revenueStats.current.total)} 
                    label={t('th_total_revenue')} 
                    icon="💰" 
                    color="text-indigo-600"
                    comparisonValue={revenueStats.comp ? formatCurrency(revenueStats.comp.total) : undefined}
                />
                <KpiCard 
                    value={formatCurrency(revenueStats.current.hh)} 
                    label={t('th_hh_fees')} 
                    icon="🏠" 
                    color="text-blue-600"
                    comparisonValue={revenueStats.comp ? formatCurrency(revenueStats.comp.hh) : undefined}
                />
                <KpiCard 
                    value={formatCurrency(revenueStats.current.commercial)} 
                    label={t('th_commercial_fees')} 
                    icon="🏢" 
                    color="text-emerald-600"
                    comparisonValue={revenueStats.comp ? formatCurrency(revenueStats.comp.commercial) : undefined}
                />
                <KpiCard 
                    value={formatCurrency(revenueStats.current.recycling)} 
                    label={t('th_recycling_revenue')} 
                    icon="♻️" 
                    color="text-amber-600"
                    comparisonValue={revenueStats.comp ? formatCurrency(revenueStats.comp.recycling) : undefined}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 text-right">{t('rev_source_dist')} لعام {selectedYear}</h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueStats.sourceDist}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {revenueStats.sourceDist.map((entry, index) => (
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

                <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 text-right">{t('rev_area_dist')} لعام {selectedYear}</h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueStats.areaDist}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="displayName" tick={{fontSize: 10, fontWeight: 700, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                    formatter={(val: number) => formatCurrency(val)} 
                                />
                                <Bar dataKey="value" name={t('th_total_revenue')} fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mb-10" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900 transition-colors">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase text-right pr-10">{t('th_area')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_hh_fees')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_commercial_fees')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_recycling_revenue')}</th>
                            <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_total_revenue')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {revenues.filter(r => r.year === selectedYear).map((rev, idx) => {
                            const areaTotal = rev.hhFees + rev.commercialFees + rev.recyclingRevenue;
                            return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200 text-right pr-10">{areaMapping[rev.area || ''] || rev.area || t('area_undefined')}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{formatCurrency(rev.hhFees)}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{formatCurrency(rev.commercialFees)}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{formatCurrency(rev.recyclingRevenue)}</td>
                                    <td className="p-4 font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(areaTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default RevenueAnalysisSection;
