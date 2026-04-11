
import React, { useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trip } from '../types';
import { MONTHS_ORDER } from '../constants';
import CollapsibleSection from './CollapsibleSection';
import ExportDropdown from './ExportDropdown';
import { exportToExcel, exportToImage } from '../services/exportService';
import { printChart } from '../services/printService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ChartSectionProps {
    data: Trip[];
    comparisonData: Trip[];
    isLoading: boolean;
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
    comparisonYear: string;
    chartRef: React.RefObject<HTMLDivElement>;
}

const ChartSection: React.FC<ChartSectionProps> = ({ data, comparisonData, isLoading, filters, selectedYear, comparisonYear, chartRef }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const [groupBy, setGroupBy] = useState<'month' | 'day'>('month');
    const [metric, setMetric] = useState<'trips' | 'tons'>('trips');

    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const chartData = useMemo(() => {
        const process = (trips: Trip[]) => {
            const grouped: { [key: string]: number } = {};
            trips.forEach(trip => {
                let key: string | null = null;
                if (groupBy === 'month') {
                    key = (trip['الشهر'] || '').toLowerCase();
                } else {
                    const date = new Date(trip['تاريخ التوزين الثاني']);
                    if (!isNaN(date.getTime())) {
                        key = date.toISOString().split('T')[0].split('-').slice(1).join('-'); 
                    }
                }
                if (!key) return;
                if (!grouped[key]) grouped[key] = 0;
                grouped[key] += metric === 'trips' ? 1 : Math.round((Number(trip['صافي التحميل'] || 0) / 1000));
            });
            return grouped;
        };

        const currentMap = process(data);
        const comparisonMap = process(comparisonData);
        const allKeys = [...new Set([...Object.keys(currentMap), ...Object.keys(comparisonMap)])];

        const merged = allKeys.map(key => ({
            name: key,
            current: currentMap[key] || 0,
            comparison: comparisonMap[key] || 0,
        }));

        if (groupBy === 'month') {
            merged.sort((a, b) => MONTHS_ORDER.indexOf(a.name) - MONTHS_ORDER.indexOf(b.name));
        } else {
            merged.sort((a, b) => a.name.localeCompare(b.name));
        }
        return merged;
    }, [data, comparisonData, groupBy, metric]);

    const handlePrint = () => {
        const chartTitle = `${t('sec_time_series')} - ${metric === 'trips' ? t('chart_trips') : t('chart_tons')} (${groupBy === 'month' ? t('chart_monthly') : t('chart_daily')})`;
        printChart(chartRef, chartTitle, filters, t, language);
    };

    const handleExportExcel = () => {
        exportToExcel(chartData, `Time_Series_${selectedYear}`);
    };

    return (
        <CollapsibleSection title={t('sec_time_series')}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-sm">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-auto flex items-center gap-2">
                        <label className="font-black text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest">{t('chart_grouping')}</label>
                        <select value={groupBy} onChange={e => setGroupBy(e.target.value as 'month' | 'day')}
                            className="p-2.5 border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-auto">
                            <option value="month">{t('chart_monthly')}</option>
                            <option value="day">{t('chart_daily')}</option>
                        </select>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                        <label className="font-black text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest">{t('chart_value')}</label>
                        <select value={metric} onChange={e => setMetric(e.target.value as 'trips' | 'tons')}
                            className="p-2.5 border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-auto">
                            <option value="trips">{t('chart_trips')}</option>
                            <option value="tons">{t('chart_tons')}</option>
                        </select>
                    </div>
                </div>
                <div className="w-full sm:w-auto flex justify-end">
                    <ExportDropdown 
                        onExportPdf={handlePrint}
                        onExportExcel={handleExportExcel}
                        onExportCsv={handleExportExcel}
                        onExportImage={() => exportToImage(chartRef, `Chart_${selectedYear}`)}
                    />
                </div>
            </div>
            <div className="h-96 w-full relative bg-white dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm" ref={chartRef}>
                 {isLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-[2rem]">
                        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: isDark ? '#f1f5f9' : '#1e293b' }}
                        />
                        <Legend wrapperStyle={{ color: axisColor, fontWeight: 700, fontSize: '11px' }} />
                        <Line type="monotone" dataKey="current" name={`${selectedYear}`} stroke="#4f46e5" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                        {comparisonYear && (
                            <Line type="monotone" dataKey="comparison" name={`${comparisonYear}`} stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </CollapsibleSection>
    );
};

export default ChartSection;
