
import React, { useMemo, useRef, useState } from 'react';
import { Worker, VehicleTableData, Population } from '../types';
import { formatNumber } from '../services/dataService';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, Cell, ComposedChart, Line
} from 'recharts';

interface AreaIntelligenceSectionProps {
    workers: Worker[];
    vehicleData: VehicleTableData[];
    population: Population[];
    selectedYear: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

// القائمة المعتمدة للمناطق حسب طلب المستخدم
const ALLOWED_AREAS = ['الطيبة', 'مؤته', 'المزار', 'العراق', 'الهاشمية', 'سول', 'جعفر'];

const AreaIntelligenceSection: React.FC<AreaIntelligenceSectionProps> = ({ workers, vehicleData, population, selectedYear }) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [activeMetric, setActiveMetric] = useState<'tons' | 'budget' | 'efficiency'>('tons');

    const areaAnalysis = useMemo(() => {
        const statsMap = new Map<string, any>();

        // تهيئة المناطق المعتمدة لضمان ظهورها حتى لو كانت البيانات صفرية
        ALLOWED_AREAS.forEach(area => {
            statsMap.set(area, { 
                name: area, 
                tons: 0, 
                trips: 0, 
                fuel: 0, 
                maint: 0, 
                workersCount: 0, 
                salaries: 0,
                population: 0,
                vehicles: new Set<string>() // تتبع أرقام الضاغطات الفريدة
            });
        });

        // 1. تجميع بيانات المركبات (أطنان، رحلات، وقود، صيانة) للمناطق المعتمدة فقط
        vehicleData.forEach(v => {
            let area = (v.area || '').trim();
            if (area === 'مؤتة') area = 'مؤته'; 

            if (ALLOWED_AREAS.includes(area)) {
                const current = statsMap.get(area);
                current.vehicles.add(v.veh); // إضافة رقم المركبة للطقم
                statsMap.set(area, {
                    ...current,
                    tons: current.tons + v.tons,
                    trips: current.trips + v.trips,
                    fuel: current.fuel + v.fuel,
                    maint: current.maint + v.maint,
                });
            }
        });

        // 2. إضافة بيانات العمال والرواتب للمناطق المعتمدة فقط
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

        // 3. إضافة بيانات السكان للمناطق المعتمدة فقط
        population.forEach(p => {
            let area = (p.area || '').trim();
            if (area === 'مؤتة') area = 'مؤته';

            if (ALLOWED_AREAS.includes(area)) {
                const current = statsMap.get(area);
                statsMap.set(area, { ...current, population: p.population });
            }
        });

        // 4. حساب المؤشرات النهائية
        return Array.from(statsMap.values()).map(item => {
            const operationalCost = item.fuel + item.maint;
            const totalBudget = operationalCost + item.salaries;
            const costPerTon = item.tons > 0 ? totalBudget / item.tons : 0;
            const tonsPerWorker = item.workersCount > 0 ? item.tons / item.workersCount : 0;
            const vehiclesCount = item.vehicles.size; // عدد الضاغطات الفريدة
            
            return {
                ...item,
                operationalCost,
                totalBudget,
                costPerTon,
                tonsPerWorker,
                vehiclesCount
            };
        }).sort((a, b) => b.tons - a.tons);
    }, [workers, vehicleData, population]);

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

    const formatCurrency = (val: number) => formatNumber(Math.round(val)) + ' د.أ';

    return (
        <CollapsibleSection title={`تقرير مناطق بلدية مؤته والمزار - تحليل شامل ${selectedYear}`} defaultOpen={false}>
            {/* بطاقات التميز في المناطق */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl shadow-xl border-r-8 border-indigo-500 relative overflow-hidden group">
                    <div className="absolute -left-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">🏆</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1 text-right">أعلى إنتاجية نفايات</div>
                    <div className="text-2xl font-black text-slate-800 text-right">{topArea?.name}</div>
                    <div className="text-indigo-600 font-bold text-sm text-right mt-1">{formatNumber(topArea?.tons || 0)} طن مرفوع</div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-xl border-r-8 border-emerald-500 relative overflow-hidden group">
                    <div className="absolute -left-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">💡</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1 text-right">الأكثر كفاءة مالية (كلفة/طن)</div>
                    <div className="text-2xl font-black text-slate-800 text-right">{mostEfficient?.name || '—'}</div>
                    <div className="text-emerald-600 font-bold text-sm text-right mt-1">
                        {mostEfficient ? `${formatNumber(mostEfficient.costPerTon, 1)} د.أ لكل طن` : 'لا توجد بيانات كافية'}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-xl border-r-8 border-amber-500 relative overflow-hidden group">
                    <div className="absolute -left-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">👥</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1 text-right">أكبر كثافة كادر بشري</div>
                    <div className="text-2xl font-black text-slate-800 text-right">
                        {areaAnalysis.reduce((p, c) => (p.workersCount > c.workersCount) ? p : c, areaAnalysis[0])?.name}
                    </div>
                    <div className="text-amber-600 font-bold text-sm text-right mt-1">
                        {areaAnalysis.reduce((p, c) => (p.workersCount > c.workersCount) ? p : c, areaAnalysis[0])?.workersCount} موظف وعامل
                    </div>
                </div>
            </div>

            {/* الرسم البياني المقارن */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mb-10 shadow-inner">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveMetric('tons')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMetric === 'tons' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
                        >
                            حسب الأطنان
                        </button>
                        <button 
                            onClick={() => setActiveMetric('budget')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMetric === 'budget' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
                        >
                            حسب الميزانية
                        </button>
                        <button 
                            onClick={() => setActiveMetric('efficiency')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMetric === 'efficiency' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
                        >
                            كفاءة الموظف
                        </button>
                    </div>
                    <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                        مقارنة الأداء في السبع مناطق المعتمدة
                        <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                    </h4>
                </div>
                
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={areaAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                            />
                            <Legend />
                            {activeMetric === 'tons' && (
                                <>
                                    <Bar yAxisId="left" dataKey="tons" name="الأطنان المرفوعة" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="trips" name="عدد الرحلات" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                                </>
                            )}
                            {activeMetric === 'budget' && (
                                <>
                                    <Bar yAxisId="left" dataKey="totalBudget" name="الميزانية الكلية (د.أ)" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="costPerTon" name="كلفة الطن (د.أ)" stroke="#ef4444" strokeWidth={3} />
                                </>
                            )}
                            {activeMetric === 'efficiency' && (
                                <>
                                    <Bar yAxisId="left" dataKey="tonsPerWorker" name="أطنان لكل عامل" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="workersCount" name="عدد العمال" stroke="#3b82f6" strokeWidth={3} />
                                </>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* جدول البيانات الموحد للمناطق */}
            <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-[11px] text-center border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase text-right pr-10">المنطقة</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">السكان</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">عدد الضاغطات</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">العمال</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">الأطنان</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">الرحلات</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">تكاليف التشغيل</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">الرواتب</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">الميزانية</th>
                            <th className="p-4 border-b border-slate-200 text-slate-500 font-black uppercase">كلفة الطن</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {areaAnalysis.map((area, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-4 font-black text-slate-800 text-right pr-10">{area.name}</td>
                                <td className="p-4 text-slate-600 font-bold">{formatNumber(area.population)}</td>
                                <td className="p-4 font-black text-blue-800">
                                    <span className="bg-slate-100 px-3 py-1 rounded-lg">
                                        {area.vehiclesCount}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black">
                                        {area.workersCount}
                                    </span>
                                </td>
                                <td className="p-4 font-black text-slate-700">{formatNumber(area.tons, 1)}</td>
                                <td className="p-4 text-slate-500">{area.trips}</td>
                                <td className="p-4 text-amber-700 font-bold">{formatCurrency(area.operationalCost)}</td>
                                <td className="p-4 text-indigo-700 font-bold">{formatCurrency(area.salaries)}</td>
                                <td className="p-4 font-black text-emerald-700">{formatCurrency(area.totalBudget)}</td>
                                <td className="p-4">
                                    <div className={`font-black rounded-lg py-1 px-2 ${area.costPerTon > 40 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {formatNumber(area.costPerTon, 1)} د.أ
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex justify-between items-center bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <div className="text-[12px] text-indigo-900 font-bold max-w-2xl text-right">
                    * يركز هذا التحليل حصراً على المناطق السبعة الرئيسية المعتمدة. تم تجميع كافة التكاليف التشغيلية (وقود وصيانة) والرواتب بناءً على التوزيع الجغرافي الفعلي للعمل الميداني.
                </div>
                <button 
                    onClick={() => printTable(tableContainerRef, 'تقرير مناطق بلدية مؤته والمزار', { vehicles: new Set(), months: new Set() })}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
                >
                    <span>🖨️</span>
                    طباعة تقرير المناطق
                </button>
            </div>
        </CollapsibleSection>
    );
};

export default AreaIntelligenceSection;
