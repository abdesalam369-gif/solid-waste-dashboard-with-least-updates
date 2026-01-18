
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trip } from '../types';
import { MONTHS_ORDER } from '../constants';
import CollapsibleSection from './CollapsibleSection';
import { printChart } from '../services/printService';

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
    const [groupBy, setGroupBy] = useState<'month' | 'day'>('month');
    const [metric, setMetric] = useState<'trips' | 'tons'>('trips');

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
                        key = date.toISOString().split('T')[0].split('-').slice(1).join('-'); // MM-DD for alignment
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
        const chartTitle = `السلاسل الزمنية - ${metric === 'trips' ? 'عدد الرحلات' : 'الأوزان (طن)'} حسب ${groupBy === 'month' ? 'الشهر' : 'اليوم'}`;
        printChart(chartRef, chartTitle, filters);
    };

    return (
        <CollapsibleSection title="السلاسل الزمنية والمقارنات">
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                <div>
                    <label htmlFor="timeGroup" className="ml-2 font-semibold">التجميع:</label>
                    <select id="timeGroup" value={groupBy} onChange={e => setGroupBy(e.target.value as 'month' | 'day')}
                        className="p-2 border border-slate-300 rounded-lg">
                        <option value="month">شهري</option>
                        <option value="day">يومي</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="metric" className="ml-2 font-semibold">القيمة:</label>
                    <select id="metric" value={metric} onChange={e => setMetric(e.target.value as 'trips' | 'tons')}
                        className="p-2 border border-slate-300 rounded-lg">
                        <option value="trips">عدد الرحلات</option>
                        <option value="tons">الأوزان (طن)</option>
                    </select>
                </div>
                <button onClick={handlePrint} className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600">
                    طباعة الرسم البياني
                </button>
            </div>
            <div className="h-96 w-full relative" ref={chartRef}>
                 {isLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                )}
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="current" 
                            name={`${selectedYear} (${metric === 'trips' ? 'رحلات' : 'أطنان'})`} 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            activeDot={{ r: 8 }} 
                        />
                        {comparisonYear && (
                            <Line 
                                type="monotone" 
                                dataKey="comparison" 
                                name={`${comparisonYear} (${metric === 'trips' ? 'رحلات' : 'أطنان'})`} 
                                stroke="#94a3b8" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </CollapsibleSection>
    );
};

export default ChartSection;
