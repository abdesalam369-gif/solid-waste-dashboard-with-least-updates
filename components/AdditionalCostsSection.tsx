
import React, { useMemo, useRef } from 'react';
import { AdditionalCost } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import { exportToExcel, exportToImage, extractTableData } from '../services/exportService';
import ExportDropdown from './ExportDropdown';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell, Legend
} from 'recharts';

interface AdditionalCostsSectionProps {
    costs: AdditionalCost[];
    filters: { vehicles: Set<string>; months: Set<string> };
}

const COLORS = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const AdditionalCostsSection: React.FC<AdditionalCostsSectionProps> = ({ costs, filters }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const sortedCosts = useMemo(() => {
        return [...costs].sort((a, b) => b.year.localeCompare(a.year));
    }, [costs]);

    const chartData = useMemo(() => {
        if (costs.length === 0) return [];
        const latest = sortedCosts[0];
        return [
            { name: t('th_insurance'), value: latest.insurance },
            { name: t('th_clothing'), value: latest.clothing },
            { name: t('th_cleaning'), value: latest.cleaning },
            { name: t('th_containers'), value: latest.containers },
        ];
    }, [sortedCosts, t]);

    const handlePrint = () => {
        printTable(tableContainerRef, t('sec_additional_costs'), filters, t, language);
    };

    const handleExportExcel = () => {
        const rawData = extractTableData(tableContainerRef);
        exportToExcel(rawData, `Additional_Costs`);
    };

    if (costs.length === 0) return null;

    return (
        <CollapsibleSection title={t('sec_additional_costs')}>
            <div className="flex items-center justify-end gap-4 mb-8">
                <ExportDropdown 
                    onExportPdf={handlePrint}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportExcel}
                    onExportImage={() => exportToImage(tableContainerRef, `ExtraCosts_Export`)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm" ref={tableContainerRef}>
                    <table className="w-full text-sm text-center border-collapse bg-white dark:bg-slate-900">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('year')}</th>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_insurance')}</th>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_clothing')}</th>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_cleaning')}</th>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_containers')}</th>
                                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{t('th_total_extra')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedCosts.map((item, idx) => {
                                const total = item.insurance + item.clothing + item.cleaning + item.containers;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{item.year}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{formatNumber(item.insurance)}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{formatNumber(item.clothing)}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{formatNumber(item.cleaning)}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{formatNumber(item.containers)}</td>
                                        <td className="p-4 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">
                                            {formatNumber(total)} {t('unit_jd')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 text-right">توزيع التكاليف الإضافية (لأحدث سنة)</h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} />
                                <YAxis tick={{fontSize: 10, fill: axisColor}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                />
                                <Bar dataKey="value" name={t('th_budget')} fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default AdditionalCostsSection;
