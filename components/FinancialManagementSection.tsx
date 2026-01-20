
import React, { useMemo, useRef } from 'react';
import { Worker, VehicleTableData } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface FinancialManagementSectionProps {
    workers: Worker[];
    vehicleData: VehicleTableData[];
    selectedYear: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const FinancialManagementSection: React.FC<FinancialManagementSectionProps> = ({ workers, vehicleData, selectedYear }) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const financialSummary = useMemo(() => {
        const totalSalaries = workers.reduce((sum, w) => sum + w.salary, 0);
        const totalFuel = vehicleData.reduce((sum, v) => sum + v.fuel, 0);
        const totalMaint = vehicleData.reduce((sum, v) => sum + v.maint, 0);
        const totalTons = vehicleData.reduce((sum, v) => sum + v.tons, 0);
        
        const grandTotal = totalSalaries + totalFuel + totalMaint;
        const costPerTonOverall = totalTons > 0 ? grandTotal / totalTons : 0;

        return {
            totalSalaries,
            totalFuel,
            totalMaint,
            grandTotal,
            totalTons,
            costPerTonOverall,
            allocation: [
                { name: 'الرواتب السنوية', value: totalSalaries },
                { name: 'كلفة الوقود', value: totalFuel },
                { name: 'كلفة الصيانة', value: totalMaint }
            ]
        };
    }, [workers, vehicleData]);

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

        // توزيع الرواتب على المناطق بشكل تقريبي بناءً على منطقة عمل العامل
        const areaSalaries = new Map<string, number>();
        workers.forEach(w => {
            const area = w.area || 'غير محدد';
            areaSalaries.set(area, (areaSalaries.get(area) || 0) + w.salary);
        });

        const allAreas = Array.from(new Set([...areaMap.keys(), ...areaSalaries.keys()]));

        return allAreas.map(area => {
            const oper = areaMap.get(area) || { fuel: 0, maint: 0, tons: 0 };
            const salaries = areaSalaries.get(area) || 0;
            const total = oper.fuel + oper.maint + salaries;
            return {
                name: area,
                salaries,
                operational: oper.fuel + oper.maint,
                total,
                efficiency: oper.tons > 0 ? total / oper.tons : 0
            };
        }).sort((a, b) => b.total - a.total);
    }, [workers, vehicleData]);

    const formatCurrency = (val: number) => formatNumber(Math.round(val)) + ' د.أ';

    return (
        <CollapsibleSection title={`الإدارة المالية والتدقيق السنوي - سنة ${selectedYear}`}>
            {/* المالية الكلية - KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl shadow-lg text-white">
                    <div className="text-emerald-100 text-xs font-bold mb-2 opacity-80 text-right">إجمالي المصاريف السنوية</div>
                    <div className="text-3xl font-black">{formatCurrency(financialSummary.grandTotal)}</div>
                    <div className="mt-4 text-[10px] bg-white/20 p-2 rounded-xl text-center">تشمل الرواتب السنوية والوقود والصيانة</div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-md border-b-4 border-blue-500">
                    <div className="text-slate-400 text-xs font-bold mb-2 text-right">كلفة الطن المالية (شاملة)</div>
                    <div className="text-3xl font-black text-blue-600">{formatNumber(financialSummary.costPerTonOverall, 2)} <span className="text-sm font-normal text-slate-400">د.أ/طن</span></div>
                    <div className="mt-2 text-[10px] text-slate-500">إجمالي الميزانية السنوية ÷ إجمالي الأطنان</div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-md border-b-4 border-amber-500">
                    <div className="text-slate-400 text-xs font-bold mb-2 text-right">كلفة التشغيل (وقود + صيانة)</div>
                    <div className="text-3xl font-black text-amber-600">{formatCurrency(financialSummary.totalFuel + financialSummary.totalMaint)}</div>
                    <div className="mt-2 text-[10px] text-slate-500 text-center font-bold">
                        {Math.round(((financialSummary.totalFuel + financialSummary.totalMaint) / financialSummary.grandTotal) * 100)}% من الميزانية
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-md border-b-4 border-indigo-500">
                    <div className="text-slate-400 text-xs font-bold mb-2 text-right">كلفة الكادر (سنوي)</div>
                    <div className="text-3xl font-black text-indigo-600">{formatCurrency(financialSummary.totalSalaries)}</div>
                    <div className="mt-2 text-[10px] text-slate-500 text-center font-bold">
                        {Math.round((financialSummary.totalSalaries / financialSummary.grandTotal) * 100)}% من الميزانية
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                {/* توزيع الميزانية */}
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                    <h4 className="text-sm font-black text-slate-700 mb-6 text-right flex items-center justify-end gap-2">
                        توزيع بنود الميزانية السنوية
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    </h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialSummary.allocation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {financialSummary.allocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* كلفة المناطق */}
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                    <h4 className="text-sm font-black text-slate-700 mb-6 text-right">مقارنة التكاليف السنوية حسب المناطق</h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={areaFinancials.slice(0, 5)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 10, fontWeight: 700}} width={80} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Bar dataKey="total" fill="#4f46e5" radius={[0, 5, 5, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* تفاصيل المناطق المالية */}
            <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase text-right pr-10">المنطقة</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase">رواتب سنوية</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase">تشغيل سنوي</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase">إجمالي الإنفاق السنوي</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase">الكلفة لكل طن</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {areaFinancials.map((area, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800 text-right pr-10">{area.name}</td>
                                <td className="p-4 text-slate-600">{formatCurrency(area.salaries)}</td>
                                <td className="p-4 text-slate-600">{formatCurrency(area.operational)}</td>
                                <td className="p-4 font-black text-emerald-700">{formatCurrency(area.total)}</td>
                                <td className="p-4 font-black text-blue-600">{formatNumber(area.efficiency, 1)} د.أ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    onClick={() => printTable(tableContainerRef, 'التقرير المالي السنوي التفصيلي للمناطق', { vehicles: new Set(), months: new Set() })}
                    className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-md"
                >
                    <span>🖨️</span>
                    طباعة التقرير المالي السنوي
                </button>
            </div>
        </CollapsibleSection>
    );
};

export default FinancialManagementSection;
