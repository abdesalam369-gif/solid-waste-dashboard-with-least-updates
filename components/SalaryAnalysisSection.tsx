
import React, { useState, useMemo, useRef } from 'react';
import { Worker } from '../types';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell
} from 'recharts';

interface SalaryAnalysisSectionProps {
    workers: Worker[];
}

const COLORS = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SalaryAnalysisSection: React.FC<SalaryAnalysisSectionProps> = ({ workers }) => {
    const [analysisMode, setAnalysisMode] = useState<'all' | 'job' | 'area'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Search filter
    const filteredWorkers = useMemo(() => {
        return workers.filter(w => 
            w.name.includes(searchTerm) || 
            w.role.includes(searchTerm) || 
            w.area.includes(searchTerm)
        );
    }, [workers, searchTerm]);

    // Job Stats
    const jobStats = useMemo(() => {
        const map = new Map<string, { count: number; total: number }>();
        filteredWorkers.forEach(w => {
            const stats = map.get(w.role) || { count: 0, total: 0 };
            stats.count++;
            stats.total += w.salary;
            map.set(w.role, stats);
        });
        return Array.from(map.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            total: data.total,
            avg: data.total / data.count
        })).sort((a, b) => b.total - a.total);
    }, [filteredWorkers]);

    // Area Stats
    const areaStats = useMemo(() => {
        const map = new Map<string, { count: number; total: number; roles: Map<string, number> }>();
        filteredWorkers.forEach(w => {
            const area = w.area || 'غير محدد';
            const stats = map.get(area) || { count: 0, total: 0, roles: new Map() };
            stats.count++;
            stats.total += w.salary;
            
            const roleCount = stats.roles.get(w.role) || 0;
            stats.roles.set(w.role, roleCount + 1);
            
            map.set(area, stats);
        });
        return Array.from(map.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            total: data.total,
            avg: data.total / data.count,
            rolesBreakdown: Array.from(data.roles.entries())
                .map(([role, count]) => `${role} (${count})`)
                .join('، ')
        })).sort((a, b) => b.total - a.total);
    }, [filteredWorkers]);

    const overallStats = useMemo(() => {
        const count = filteredWorkers.length;
        const total = filteredWorkers.reduce((sum, w) => sum + w.salary, 0);
        const avg = count > 0 ? total / count : 0;
        return { count, total, avg };
    }, [filteredWorkers]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    const handlePrint = () => {
        const titles = {
            all: 'كشف الأجور السنوي التفصيلي',
            job: 'تحليل الأجور السنوية حسب الوظيفة',
            area: 'تحليل الأجور السنوية حسب المنطقة'
        };
        printTable(tableContainerRef, titles[analysisMode], { vehicles: new Set(), months: new Set() });
    };

    if (workers.length === 0) return null;

    return (
        <CollapsibleSection title="تحليل الميزانية السنوية للأجور">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 items-end shadow-inner text-right">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-500 mr-1">تحليل حسب:</label>
                    <select 
                        value={analysisMode} 
                        onChange={(e) => setAnalysisMode(e.target.value as any)}
                        className="bg-white border-2 border-indigo-100 rounded-2xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px] transition-all"
                    >
                        <option value="all">كافة الموظفين</option>
                        <option value="job">حسب المسمى الوظيفي</option>
                        <option value="area">حسب المنطقة</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-500 mr-1">بحث سريع:</label>
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث بالاسم، الوظيفة أو المنطقة..."
                        className="bg-white border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] transition-all text-right"
                    />
                </div>

                <div className="flex flex-1 justify-end">
                    <button 
                        onClick={handlePrint} 
                        className="px-8 py-3 bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span>🖨️</span>
                        طباعة الكشف السنوي
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-indigo-600 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-indigo-600 transition-colors text-right">إجمالي عدد الكادر</div>
                    <div className="text-5xl font-black text-slate-800 flex items-baseline gap-2 justify-end">
                        <span className="text-sm font-normal text-slate-400">عامل</span>
                        {overallStats.count.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-emerald-500 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-emerald-600 transition-colors text-right">إجمالي الميزانية السنوية</div>
                    <div className="text-5xl font-black text-emerald-600 flex items-baseline gap-2 justify-end">
                        <span className="text-sm font-normal text-slate-400 italic">د.أ</span>
                        {formatCurrency(overallStats.total)}
                    </div>
                </div>
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-blue-500 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-blue-600 transition-colors text-right">متوسط الراتب السنوي</div>
                    <div className="text-5xl font-black text-blue-600 flex items-baseline gap-2 justify-end">
                        <span className="text-sm font-normal text-slate-400 italic">د.أ</span>
                        {formatCurrency(overallStats.avg)}
                    </div>
                </div>
            </div>

            {/* Distribution Charts */}
            {analysisMode !== 'all' && (
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mb-10 shadow-inner">
                    <h4 className="text-sm font-black text-slate-700 mb-8 flex items-center gap-2 text-right">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                        {analysisMode === 'job' ? 'توزيع الميزانية السنوية حسب الوظائف' : 'توزيع الميزانية السنوية حسب المناطق'}
                    </h4>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={analysisMode === 'job' ? jobStats : areaStats}
                                margin={{ left: 20, right: 30, top: 10, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                                />
                                <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={40}>
                                    {(analysisMode === 'job' ? jobStats : areaStats).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-50">
                        {analysisMode === 'all' ? (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">اسم الموظف</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">المسمى الوظيفي</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">المنطقة</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">الراتب السنوي (د.أ)</th>
                            </tr>
                        ) : analysisMode === 'job' ? (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">المسمى الوظيفي</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">عدد الموظفين</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">إجمالي الرواتب السنوية</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">متوسط الأجر السنوي</th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">المنطقة</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">عدد العمال</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right">المسميات الوظيفية</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">إجمالي الرواتب السنوية</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {analysisMode === 'all' && filteredWorkers.map((worker, idx) => (
                            <tr key={`${worker.name}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-5 font-bold text-slate-800 text-right pr-14">{worker.name}</td>
                                <td className="p-5">
                                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-indigo-100 shadow-sm uppercase">
                                        {worker.role}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-500 font-medium">{worker.area}</td>
                                <td className="p-5 font-black text-emerald-700 text-lg">
                                    {formatCurrency(worker.salary)}
                                </td>
                            </tr>
                        ))}
                        
                        {analysisMode === 'job' && jobStats.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 font-black text-slate-800 text-right pr-14">{item.name}</td>
                                <td className="p-5 font-bold text-slate-600">{item.count}</td>
                                <td className="p-5 font-black text-emerald-700">{formatCurrency(item.total)} د.أ</td>
                                <td className="p-5 font-black text-blue-600">{formatCurrency(item.avg)} د.أ</td>
                            </tr>
                        ))}

                        {analysisMode === 'area' && areaStats.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 font-black text-slate-800 text-right pr-14">{item.name}</td>
                                <td className="p-5 font-bold text-slate-600">{item.count}</td>
                                <td className="p-5 text-right">
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {item.rolesBreakdown.split('، ').map((role, rIdx) => (
                                            <span key={rIdx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-5 font-black text-emerald-700">{formatCurrency(item.total)} د.أ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border-r-8 border-blue-400 text-[12px] text-blue-900 leading-relaxed font-bold text-right shadow-sm">
                * جميع الرواتب المعروضة هي رواتب سنوية (إجمالي 12 شهراً). يعتمد التحليل على كشف الرواتب الموحد لبلدية مؤتة والمزار (GID=386592046) مع تحويل القيم الشهرية إلى سنوية لضمان دقة التقارير الإجمالية وكفاءة الإنفاق لكل طن.
            </div>
        </CollapsibleSection>
    );
};

export default SalaryAnalysisSection;
