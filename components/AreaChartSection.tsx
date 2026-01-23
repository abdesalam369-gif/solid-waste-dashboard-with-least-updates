
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import ExportDropdown from './ExportDropdown';
import { printChart } from '../services/printService';
import { exportToExcel, exportToImage } from '../services/exportService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface AreaChartSectionProps {
    data: { name: string; value: number }[];
    isLoading: boolean;
    filters: { vehicles: Set<string>; months: Set<string> };
    chartRef: React.RefObject<HTMLDivElement>;
}

const COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#ef4444'];

const AreaChartSection: React.FC<AreaChartSectionProps> = ({ data, isLoading, filters, chartRef }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const handlePrint = () => {
        printChart(chartRef, t('sec_waste_dist'), filters, t, language);
    };

    // دالة مخصصة لرسم النسب المئوية كأرقام صحيحة داخل الأجزاء
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        if (percent < 0.04) return null; // إخفاء النسب الصغيرة جداً لتفادي التداخل

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor="middle" 
                dominantBaseline="central"
                className="text-[12px] font-black pointer-events-none"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <CollapsibleSection title={t('sec_waste_dist')}>
             <div className="flex items-center justify-end gap-4 mb-6 text-sm">
                <ExportDropdown 
                    onExportPdf={handlePrint}
                    onExportExcel={() => exportToExcel(data, "Waste_Distribution")}
                    onExportCsv={() => exportToExcel(data, "Waste_Distribution")}
                    onExportImage={() => exportToImage(chartRef, "Waste_Distribution_Image")}
                />
            </div>
             <div className="h-96 w-full relative" ref={chartRef}>
                 {isLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                )}
                <ResponsiveContainer>
                    <PieChart>
                        <Pie 
                            data={data} 
                            cx="50%" 
                            cy="50%" 
                            labelLine={false} 
                            label={renderCustomizedLabel}
                            outerRadius={140} 
                            dataKey="value" 
                            nameKey="name"
                            stroke="none"
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: isDark ? '#1e293b' : '#fff', 
                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                borderRadius: '12px',
                                color: isDark ? '#f1f5f9' : '#1e293b'
                            }}
                        />
                        <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : '#64748b', paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
             </div>
        </CollapsibleSection>
    );
};

export default AreaChartSection;
