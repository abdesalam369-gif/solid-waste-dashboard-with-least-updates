
import React, { useState, useMemo, useRef } from 'react';
import { Worker } from '../types';
import { printTable } from '../services/printService';
import CollapsibleSection from './CollapsibleSection';
import { useLanguage } from '../contexts/LanguageContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell
} from 'recharts';

interface SalaryAnalysisSectionProps {
    workers: Worker[];
}

const COLORS = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SalaryAnalysisSection: React.FC<SalaryAnalysisSectionProps> = ({ workers }) => {
    /* Fix: Destructure 'language' as it's required for printTable */
    const { t, language } = useLanguage();
    const [analysisMode, setAnalysisMode] = useState<'all' | 'job' | 'area'>('all');
    const [searchTerm, setSearchTerm] = useState('');
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

    const roleMapping: {[key: string]: string} = {
        'سائق': t('role_driver'),
        'عامل وطن': t('role_cleaner'),
        'ميكانيكي': t('role_mechanic'),
        'مراقب': t('role_supervisor')
    };

    const filteredWorkers = useMemo(() => {
        return workers.filter(w => 
            w.name.includes(searchTerm) || 
            w.role.includes(searchTerm) || 
            w.area.includes(searchTerm)
        );
    }, [workers, searchTerm]);

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
            displayName: roleMapping[name] || name,
            count: data.count,
            total: data.total,
            avg: data.total / data.count
        })).sort((a, b) => b.total - a.total);
    }, [filteredWorkers, t]);

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
            displayName: areaMapping[name] || name,
            count: data.count,
            total: data.total,
            avg: data.total / data.count,
            rolesBreakdown: Array.from(data.roles.entries())
                .map(([role, count]) => `${roleMapping[role] || role} (${count})`)
                .join(', ')
        })).sort((a, b) => b.total - a.total);
    }, [filteredWorkers, t]);

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
        }) + ' ' + t('unit_jd');
    };

    const handlePrint = () => {
        /* Fix: Pass missing 't' and 'language' arguments to printTable */
        printTable(tableContainerRef, t('sec_salary_analysis'), { vehicles: new Set(), months: new Set() }, t, language);
    };

    if (workers.length === 0) return null;

    return (
        <CollapsibleSection title={t('sec_salary_analysis')}>
            <div className="flex flex-wrap gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 items-end shadow-inner text-right">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-500 mr-1">{t('chart_grouping')}</label>
                    <select 
                        value={analysisMode} 
                        onChange={(e) => setAnalysisMode(e.target.value as any)}
                        className="bg-white border-2 border-indigo-100 rounded-2xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px] transition-all"
                    >
                        <option value="all">{t('all_employees')}</option>
                        <option value="job">{t('by_job')}</option>
                        <option value="area">{t('by_area')}</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-500 mr-1">{t('search_placeholder')}</label>
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('search_placeholder')}
                        className="bg-white border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] transition-all text-right"
                    />
                </div>

                <div className="flex flex-1 justify-end">
                    <button 
                        onClick={handlePrint} 
                        className="px-8 py-3 bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {t('print')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-indigo-600 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-indigo-600 transition-colors text-right">{t('th_emp_count')}</div>
                    <div className="text-5xl font-black text-slate-800 flex items-baseline gap-2 justify-end">
                        <span className="text-sm font-normal text-slate-400">{t('unit_worker')}</span>
                        {overallStats.count.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-emerald-500 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-emerald-600 transition-colors text-right">{t('th_total_salaries')}</div>
                    <div className="text-5xl font-black text-emerald-600 flex items-baseline gap-2 justify-end">
                        {formatCurrency(overallStats.total)}
                    </div>
                </div>
                <div className="bg-white p-7 rounded-3xl shadow-xl border-r-8 border-blue-500 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest group-hover:text-blue-600 transition-colors text-right">{t('th_avg_annual_wage')}</div>
                    <div className="text-5xl font-black text-blue-600 flex items-baseline gap-2 justify-end">
                        {formatCurrency(overallStats.avg)}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm" ref={tableContainerRef}>
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-50">
                        {analysisMode === 'all' ? (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">{t('th_emp_name')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_job_title')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_area')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_annual_salary')}</th>
                            </tr>
                        ) : analysisMode === 'job' ? (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">{t('th_job_title')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_emp_count')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_total_salaries')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_avg_annual_wage')}</th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right pr-14">{t('th_area')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_emp_count')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest text-right">{t('th_job_title')}</th>
                                <th className="p-5 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">{t('th_total_salaries')}</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {analysisMode === 'all' && filteredWorkers.map((worker, idx) => (
                            <tr key={`${worker.name}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-5 font-bold text-slate-800 text-right pr-14">{worker.name}</td>
                                <td className="p-5">
                                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-indigo-100 shadow-sm uppercase">
                                        {roleMapping[worker.role] || worker.role}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-500 font-medium">{areaMapping[worker.area] || worker.area}</td>
                                <td className="p-5 font-black text-emerald-700 text-lg">
                                    {formatCurrency(worker.salary)}
                                </td>
                            </tr>
                        ))}
                        
                        {analysisMode === 'job' && jobStats.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 font-black text-slate-800 text-right pr-14">{item.displayName}</td>
                                <td className="p-5 font-bold text-slate-600">{item.count}</td>
                                <td className="p-5 font-black text-emerald-700">{formatCurrency(item.total)}</td>
                                <td className="p-5 font-black text-blue-600">{formatCurrency(item.avg)}</td>
                            </tr>
                        ))}

                        {analysisMode === 'area' && areaStats.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 font-black text-slate-800 text-right pr-14">{item.displayName}</td>
                                <td className="p-5 font-bold text-slate-600">{item.count}</td>
                                <td className="p-5 text-right">
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {item.rolesBreakdown.split(', ').map((role, rIdx) => (
                                            <span key={rIdx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-5 font-black text-emerald-700">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CollapsibleSection>
    );
};

export default SalaryAnalysisSection;
