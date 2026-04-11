
import React, { useMemo, useState } from 'react';
import { Distance, Maintenance, Fuel, Trip } from '../types';
import { formatNumber } from '../services/dataService';
import CollapsibleSection from './CollapsibleSection';
import KpiCard from './KpiCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { MONTHS_ORDER } from '../constants';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line, Cell,
    ScatterChart, Scatter, ZAxis
} from 'recharts';

interface OperationalPerformanceSectionProps {
    distanceData: Distance[];
    maintData: Maintenance[];
    fuelData: Fuel[];
    fuelLitersData: Fuel[];
    tripsData: Trip[];
    filters: { vehicles: Set<string>; months: Set<string> };
    selectedYear: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const OperationalPerformanceSection: React.FC<OperationalPerformanceSectionProps> = ({
    distanceData, maintData, fuelData, fuelLitersData, tripsData, filters, selectedYear
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const [searchTerm, setSearchTerm] = useState('');

    const processedData = useMemo(() => {
        const vehicles = new Set<string>();
        // Get all vehicles from all sources for the selected year
        distanceData.filter(d => d['السنة'] === selectedYear).forEach(d => vehicles.add(d['رقم المركبة']));
        maintData.filter(m => m['السنة'] === selectedYear).forEach(m => vehicles.add(m['رقم المركبة']));
        fuelData.filter(f => f['السنة'] === selectedYear).forEach(f => vehicles.add(f['رقم المركبة']));

        const results = Array.from(vehicles).map(v => {
            const distRow = distanceData.find(d => d['رقم المركبة'] === v && d['السنة'] === selectedYear);
            const distance = distRow ? Number(distRow['المسافة المقطوعة (كم)'].replace(/,/g, '')) || 0 : 0;

            const vehicleMaint = maintData.filter(m => m['رقم المركبة'] === v && m['السنة'] === selectedYear);
            const totalMaint = vehicleMaint.reduce((sum, m) => sum + Number(m['كلفة الصيانة']), 0);

            const fuelRow = fuelData.find(f => f['رقم المركبة'] === v && f['السنة'] === selectedYear);
            const fuelLitersRow = fuelLitersData.find(f => f['رقم المركبة'] === v && f['السنة'] === selectedYear);

            let totalFuelCost = 0;
            let totalFuelLiters = 0;
            
            MONTHS_ORDER.forEach(m => {
                if (fuelRow) totalFuelCost += Number(fuelRow[m as keyof Fuel]) || 0;
                if (fuelLitersRow) totalFuelLiters += Number(fuelLitersRow[m as keyof Fuel]) || 0;
            });

            const opCost = totalMaint + totalFuelCost;
            const costPerKm = distance > 0 ? opCost / distance : 0;
            const maintPerKm = distance > 0 ? totalMaint / distance : 0;
            const fuelPerKm = distance > 0 ? totalFuelLiters / distance : 0;

            return {
                name: v,
                distance,
                maint: totalMaint,
                fuelCost: totalFuelCost,
                fuelLiters: totalFuelLiters,
                opCost,
                costPerKm,
                maintPerKm,
                fuelPerKm
            };
        });

        // Filter by vehicle if needed
        return filters.vehicles.size > 0 
            ? results.filter(r => filters.vehicles.has(r.name))
            : results;
    }, [distanceData, maintData, fuelData, fuelLitersData, selectedYear, filters.vehicles]);

    const kpis = useMemo(() => {
        const totalDist = processedData.reduce((sum, r) => sum + r.distance, 0);
        const totalMaint = processedData.reduce((sum, r) => sum + r.maint, 0);
        const totalFuel = processedData.reduce((sum, r) => sum + r.fuelCost, 0);
        const totalFuelLiters = processedData.reduce((sum, r) => sum + r.fuelLiters, 0);
        const totalOpCost = totalMaint + totalFuel;

        const avgCostPerKm = totalDist > 0 ? totalOpCost / totalDist : 0;
        const avgMaintPerKm = totalDist > 0 ? totalMaint / totalDist : 0;
        const avgFuelPerKm = totalDist > 0 ? totalFuelLiters / totalDist : 0;

        const sortedByEff = [...processedData].filter(r => r.distance > 100).sort((a, b) => a.costPerKm - b.costPerKm);
        const mostEfficient = sortedByEff[0]?.name || "—";
        const mostConsuming = sortedByEff[sortedByEff.length - 1]?.name || "—";

        return {
            totalDist,
            avgMaintPerKm,
            avgFuelPerKm,
            avgCostPerKm,
            mostEfficient,
            mostConsuming
        };
    }, [processedData]);

    const barChartData = useMemo(() => {
        return [...processedData].sort((a, b) => b.opCost - a.opCost).slice(0, 15);
    }, [processedData]);

    const scatterData = useMemo(() => {
        return processedData.map(r => ({
            x: r.distance,
            y: r.maint,
            name: r.name
        }));
    }, [processedData]);

    const lineChartData = useMemo(() => {
        // Since distance is yearly, we distribute it by trips if possible
        const monthlyStats = MONTHS_ORDER.map(m => {
            let monthMaint = 0;
            let monthFuel = 0;
            let monthTrips = 0;

            processedData.forEach(v => {
                const vehicleMaint = maintData.find(md => md['رقم المركبة'] === v.name && md['السنة'] === selectedYear && md['الشهر'] === m);
                if (vehicleMaint) monthMaint += Number(vehicleMaint['كلفة الصيانة']);

                const fuelRow = fuelData.find(f => f['رقم المركبة'] === v.name && f['السنة'] === selectedYear);
                if (fuelRow) monthFuel += Number(fuelRow[m as keyof Fuel]) || 0;

                const vTrips = tripsData.filter(t => t['رقم المركبة'] === v.name && t['السنة'] === selectedYear && t['الشهر']?.toLowerCase() === m).length;
                monthTrips += vTrips;
            });

            return {
                name: t(`month_${m}`),
                maint: monthMaint,
                fuel: monthFuel,
                trips: monthTrips
            };
        });

        // Estimate distance per month based on trips
        const totalTrips = monthlyStats.reduce((sum, s) => sum + s.trips, 0);
        const totalDist = kpis.totalDist;

        return monthlyStats.map(s => ({
            ...s,
            distance: totalTrips > 0 ? (s.trips / totalTrips) * totalDist : 0
        }));
    }, [processedData, maintData, fuelData, selectedYear, tripsData, t, kpis.totalDist]);

    const top5OpCost = useMemo(() => [...processedData].sort((a, b) => b.opCost - a.opCost).slice(0, 5), [processedData]);
    const top5LowEff = useMemo(() => [...processedData].filter(r => r.distance > 100).sort((a, b) => b.costPerKm - a.costPerKm).slice(0, 5), [processedData]);

    const filteredTableData = useMemo(() => {
        return processedData.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [processedData, searchTerm]);

    const handleExportCSV = () => {
        const headers = [
            t('th_veh_no'), t('th_distance'), t('th_maint'), t('th_fuel'), 
            t('th_fuel_liters'), t('th_operational_cost'), t('kpi_maint_cost_km'), 
            t('kpi_fuel_cons_km'), t('kpi_op_cost_km'), t('lbl_veh_classification')
        ];
        
        const rows = filteredTableData.map(r => [
            r.name, r.distance, r.maint, r.fuelCost, r.fuelLiters, r.opCost, 
            r.maintPerKm.toFixed(3), r.fuelPerKm.toFixed(3), r.costPerKm.toFixed(3), 
            t(`status_${smartAnalysis.classification.find(c => c.name === r.name)?.status}`)
        ]);

        const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `operational_performance_${selectedYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintTable = () => {
        const tableElement = document.querySelector('#vehicle-comparison-table table');
        if (!tableElement) return;

        const isRtl = language === 'ar';
        const dir = isRtl ? 'rtl' : 'ltr';
        
        // Use window.open for better reliability in some environments
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            // Fallback to current window if popup is blocked
            window.print();
            return;
        }

        const tableHtml = tableElement.outerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${dir}" lang="${language}">
            <head>
                <meta charset="UTF-8">
                <title>${t('comparison')} - ${selectedYear}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    * { 
                        box-sizing: border-box; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    body { 
                        font-family: 'Cairo', 'Inter', sans-serif; 
                        padding: 40px; 
                        background: white; 
                        color: #1e293b;
                        line-height: 1.6;
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        border-bottom: 3px solid #3b82f6; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px; 
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 26px; 
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .header p {
                        margin: 5px 0 0 0;
                        color: #3b82f6;
                        font-weight: 700;
                    }
                    .date {
                        font-size: 12px;
                        color: #94a3b8;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px;
                        font-size: 11px;
                        border: 1px solid #e2e8f0;
                    }
                    th, td { 
                        border: 1px solid #e2e8f0; 
                        padding: 12px 10px; 
                        text-align: ${isRtl ? 'right' : 'left'}; 
                    }
                    th { 
                        background-color: #f8fafc !important; 
                        font-weight: 800;
                        color: #475569;
                        text-transform: uppercase;
                        white-space: nowrap;
                    }
                    tr:nth-child(even) { background-color: #fcfdfe; }
                    
                    /* Badge Styles */
                    .bg-emerald-100 { background-color: #d1fae5 !important; color: #065f46 !important; border: 1px solid #a7f3d0 !important; }
                    .bg-blue-100 { background-color: #dbeafe !important; color: #1e40af !important; border: 1px solid #bfdbfe !important; }
                    .bg-red-100 { background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fecaca !important; }
                    
                    .rounded-full { border-radius: 9999px; }
                    .px-3 { padding-left: 12px; padding-right: 12px; }
                    .py-1 { padding-top: 4px; padding-bottom: 4px; }
                    .text-\\[10px\\] { font-size: 10px; }
                    .font-black { font-weight: 900; }
                    .font-bold { font-weight: 700; }
                    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                    .text-red-600 { color: #dc2626 !important; }
                    
                    @media print {
                        @page { size: A4 landscape; margin: 15mm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${t('comparison')} - ${selectedYear}</h1>
                        <p>${t('municipality_name')}</p>
                    </div>
                    <div class="date">
                        ${new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                ${tableHtml}
                <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    ${t('print_footer_text')}
                </div>
                <script>
                    window.onload = () => {
                        // Wait for fonts to be ready
                        if (document.fonts) {
                            document.fonts.ready.then(() => {
                                setTimeout(() => {
                                    window.print();
                                    // window.close();
                                }, 500);
                            });
                        } else {
                            setTimeout(() => {
                                window.print();
                                // window.close();
                            }, 1500);
                        }
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrint = () => {
        window.print();
    };

    const smartAnalysis = useMemo(() => {
        const avgMaintDistRatio = kpis.avgMaintPerKm;
        const avgFuelDistRatio = kpis.avgFuelPerKm;

        const highMaintVehicles = processedData.filter(r => r.distance > 500 && r.maintPerKm > avgMaintDistRatio * 1.8);
        const illogicalFuelVehicles = processedData.filter(r => r.distance > 500 && r.fuelPerKm > avgFuelDistRatio * 1.8);

        const classification = processedData.map(r => {
            let status = 'medium';
            if (r.distance < 100) status = 'medium';
            else if (r.costPerKm < kpis.avgCostPerKm * 0.8) status = 'efficient';
            else if (r.costPerKm > kpis.avgCostPerKm * 1.3) status = 'inefficient';
            
            return { name: r.name, status };
        });

        return {
            highMaintVehicles,
            illogicalFuelVehicles,
            classification
        };
    }, [processedData, kpis]);

    return (
        <CollapsibleSection title={t('sec_op_perf_analysis')}>
            <div id="op-perf-kpi-grid" className="kpi-section">
                <h3 className="hidden">{t('sec_op_perf_analysis')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <KpiCard 
                        value={formatNumber(kpis.totalDist) + ' ' + t('unit_km')} 
                        label={t('kpi_total_distance')} 
                        icon="🛣️" 
                        color="text-blue-600" 
                    />
                    <KpiCard 
                        value={formatNumber(kpis.avgMaintPerKm, 3) + ' ' + t('unit_jd_km')} 
                        label={t('kpi_maint_cost_km')} 
                        icon="🔧" 
                        color="text-orange-600" 
                    />
                    <KpiCard 
                        value={formatNumber(kpis.avgFuelPerKm, 3) + ' ' + t('unit_liter_km')} 
                        label={t('kpi_fuel_cons_km')} 
                        icon="⛽" 
                        color="text-green-600" 
                    />
                    <KpiCard 
                        value={formatNumber(kpis.avgCostPerKm, 3) + ' ' + t('unit_jd_km')} 
                        label={t('kpi_op_cost_km')} 
                        icon="💰" 
                        color="text-red-600" 
                    />
                    <KpiCard 
                        value={kpis.mostEfficient} 
                        label={t('kpi_most_efficient_veh')} 
                        icon="✅" 
                        color="text-emerald-600" 
                    />
                    <KpiCard 
                        value={kpis.mostConsuming} 
                        label={t('kpi_most_consuming_veh')} 
                        icon="⚠️" 
                        color="text-rose-600" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Operational Cost per Vehicle */}
                <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {t('chart_op_cost_per_veh')}
                    </h4>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }}
                                    formatter={(val: number) => formatNumber(val) + ' ' + t('unit_jd')}
                                />
                                <Bar dataKey="opCost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distance vs Maintenance Scatter */}
                <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        {t('chart_dist_vs_maint')}
                    </h4>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis type="number" dataKey="x" name={t('unit_km')} unit="km" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis type="number" dataKey="y" name={t('unit_jd')} unit="JD" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <ZAxis type="category" dataKey="name" name={t('th_veh_no')} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }} />
                                <Scatter name="Vehicles" data={scatterData} fill="#6366f1" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Distance, Fuel & Maint Over Time */}
                <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        {t('chart_dist_fuel_maint_over_time')}
                    </h4>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="distance" name={t('unit_km')} stroke="#10b981" strokeWidth={3} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="fuel" name={t('kpi_fuel_cost')} stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="maint" name={t('kpi_maint_cost')} stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Vehicles Analysis */}
                <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        {t('chart_top_5_op_cost')} & {t('chart_top_5_low_eff')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 h-80">
                        <div className="h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top5OpCost} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} width={40} />
                                    <Tooltip formatter={(val: number) => formatNumber(val) + ' JD'} />
                                    <Bar dataKey="opCost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top5LowEff} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: axisColor}} axisLine={false} tickLine={false} width={40} />
                                    <Tooltip formatter={(val: number) => formatNumber(val, 3) + ' JD/km'} />
                                    <Bar dataKey="costPerKm" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Analysis Section */}
            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
                <h4 className="text-xl font-black mb-8 flex items-center gap-3">
                    <span className="bg-white/10 p-2 rounded-lg">🧠</span>
                    {t('lbl_smart_op_perf_analysis')}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* High Maintenance Alert */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="text-orange-400 text-xs font-black uppercase mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                            {t('lbl_high_maint_dist_ratio')}
                        </div>
                        <div className="space-y-3">
                            {smartAnalysis.highMaintVehicles.length > 0 ? (
                                smartAnalysis.highMaintVehicles.slice(0, 5).map((v, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300 font-bold">{v.name}</span>
                                        <span className="text-orange-300 font-black">{formatNumber(v.maintPerKm, 3)} JD/km</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 text-xs italic">No critical vehicles identified</div>
                            )}
                        </div>
                    </div>

                    {/* Illogical Fuel Consumption */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="text-red-400 text-xs font-black uppercase mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                            {t('lbl_illogical_fuel_cons')}
                        </div>
                        <div className="space-y-3">
                            {smartAnalysis.illogicalFuelVehicles.length > 0 ? (
                                smartAnalysis.illogicalFuelVehicles.slice(0, 5).map((v, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300 font-bold">{v.name}</span>
                                        <span className="text-red-300 font-black">{formatNumber(v.fuelPerKm, 3)} L/km</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 text-xs italic">No critical vehicles identified</div>
                            )}
                        </div>
                    </div>

                    {/* Efficiency Classification */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="text-emerald-400 text-xs font-black uppercase mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                            {t('lbl_veh_classification')}
                        </div>
                        <div className="space-y-4">
                            {['efficient', 'medium', 'inefficient'].map(status => {
                                const count = smartAnalysis.classification.filter(c => c.status === status).length;
                                const color = status === 'efficient' ? 'bg-emerald-500' : status === 'medium' ? 'bg-blue-500' : 'bg-red-500';
                                return (
                                    <div key={status} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                            <span className="text-slate-400">{t(`status_${status}`)}</span>
                                            <span className="text-slate-200">{count}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${color} transition-all duration-1000`} 
                                                style={{ width: `${(count / smartAnalysis.classification.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Vehicle Comparison Table */}
            <div id="vehicle-comparison-table" className="mt-8 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none print:border-none">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {t('comparison')}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-grow md:flex-grow-0">
                            <input 
                                type="text" 
                                placeholder={t('th_veh_no')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-48 pl-8 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        </div>
                        <button 
                            onClick={handleExportCSV}
                            className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center gap-2"
                        >
                            <span>📥</span> {t('btn_export_csv')}
                        </button>
                        <button 
                            onClick={handlePrintTable}
                            className="px-4 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span> {t('btn_print_table')}
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="px-4 py-2 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span> {t('btn_print')}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="px-6 py-4">{t('th_veh_no')}</th>
                                <th className="px-6 py-4">{t('th_distance')}</th>
                                <th className="px-6 py-4">{t('th_maint')}</th>
                                <th className="px-6 py-4">{t('th_fuel')}</th>
                                <th className="px-6 py-4">{t('th_fuel_liters')}</th>
                                <th className="px-6 py-4">{t('th_operational_cost')}</th>
                                <th className="px-6 py-4">{t('kpi_maint_cost_km')}</th>
                                <th className="px-6 py-4">{t('kpi_fuel_cons_km')}</th>
                                <th className="px-6 py-4">{t('kpi_op_cost_km')}</th>
                                <th className="px-6 py-4">{t('lbl_veh_classification')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredTableData.map((r, i) => {
                                const status = smartAnalysis.classification.find(c => c.name === r.name)?.status;
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">{r.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.distance)} km</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.maint)} JD</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.fuelCost)} JD</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.fuelLiters)} L</td>
                                        <td className="px-6 py-4 text-sm font-bold text-red-600 dark:text-red-400 font-mono">{formatNumber(r.opCost)} JD</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.maintPerKm, 3)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.fuelPerKm, 3)} L/km</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{formatNumber(r.costPerKm, 3)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                status === 'efficient' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                status === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {t(`status_${status}`)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default OperationalPerformanceSection;
