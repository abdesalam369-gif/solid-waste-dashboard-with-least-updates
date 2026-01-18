import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { printChart } from '../services/printService';

interface AreaChartSectionProps {
    data: { name: string; value: number }[];
    isLoading: boolean;
    filters: { vehicles: Set<string>; months: Set<string> };
    chartRef: React.RefObject<HTMLDivElement>;
}

const COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#ef4444'];

const AreaChartSection: React.FC<AreaChartSectionProps> = ({ data, isLoading, filters, chartRef }) => {
    
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const percent = payload[0].percent;
            const percentDisplay = (isFinite(percent) && percent > 0) 
                ? `(${(percent * 100).toFixed(1)}%)`
                : '';
            
            return (
                <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                    <p className="font-bold">{`${payload[0].name}`}</p>
                    <p className="text-sm">{`الكمية: ${payload[0].value.toLocaleString()} طن ${percentDisplay}`}</p>
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (!isFinite(percent) || percent <= 0.02) {
            return null;
        }
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-sm">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    const totalValue = data.reduce((sum, entry) => sum + entry.value, 0);

    const handlePrint = () => {
        // FIX: Use the 'chartRef' prop, which is passed to this component, instead of the undefined 'chartContainerRef'.
        printChart(chartRef, 'توزيع النفايات حسب المنطقة', filters);
    };

    return (
        <CollapsibleSection title="توزيع النفايات حسب المنطقة">
             <div className="flex items-center justify-end gap-4 mb-4 text-sm">
                <button 
                    onClick={handlePrint} 
                    className="px-3 py-2 border-none rounded-lg bg-emerald-500 text-white text-sm font-semibold cursor-pointer shadow-md transition hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    disabled={isLoading || totalValue === 0}
                >
                    طباعة الرسم البياني
                </button>
            </div>
             <div className="h-96 w-full relative" ref={chartRef}>
                 {isLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                )}
                {!isLoading && totalValue > 0 ? (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={130}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={renderCustomizedLabel}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{fontSize: '0.875rem'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    !isLoading && <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        لا توجد بيانات لعرضها في الرسم البياني.
                    </div>
                )}
             </div>
        </CollapsibleSection>
    );
};

export default AreaChartSection;