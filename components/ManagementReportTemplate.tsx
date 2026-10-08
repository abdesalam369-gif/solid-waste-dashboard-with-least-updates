import React, { useMemo } from 'react';
import { 
    Trip, VehicleTableData, Fuel, Maintenance, Worker, 
    Revenue, Population, AdditionalCost, Area 
} from '../types';
import { formatNumber } from '../services/dataService';
import { MONTHS_ORDER } from '../constants';
import { 
    ResponsiveContainer, BarChart, Bar, LineChart, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export interface ManagementReportTemplateProps {
    title: string;
    recipient: string;
    notes: string;
    includeSignatures: boolean;
    includeKpis: boolean;
    scope: 'current_view' | 'specific_chart' | 'full_executive';
    selectedChart: string;
    selectedYear: string;
    comparisonYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
    tripsData: Trip[];
    vehicleTableData: VehicleTableData[];
    fuelData: Fuel[];
    fuelLitersData: Fuel[];
    maintData: Maintenance[];
    workersData: Worker[];
    revenuesData: Revenue[];
    populationData: Population[];
    additionalCosts: AdditionalCost[];
    areasData: Area[];
    activeTab: string;
    currentViewHtml?: string;
    isAr: boolean;
}

export const ManagementReportTemplate: React.FC<ManagementReportTemplateProps> = ({
    title,
    recipient,
    notes,
    includeSignatures,
    includeKpis,
    scope,
    selectedChart,
    selectedYear,
    comparisonYear,
    filters,
    tripsData,
    vehicleTableData,
    fuelData,
    fuelLitersData,
    maintData,
    workersData,
    revenuesData,
    populationData,
    additionalCosts,
    areasData,
    activeTab,
    currentViewHtml,
    isAr
}) => {
    const today = new Date().toLocaleDateString(isAr ? 'ar-JO' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const nowTime = new Date().toLocaleTimeString(isAr ? 'ar-JO' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Compute key executive metrics
    const metrics = useMemo(() => {
        const yearTrips = tripsData.filter(t => {
            const matchYear = t['السنة'] === selectedYear;
            const matchVeh = filters.vehicles.size === 0 || filters.vehicles.has(t['رقم المركبة']);
            const matchMonth = filters.months.size === 0 || filters.months.has((t['الشهر'] || '').toLowerCase());
            return matchYear && matchVeh && matchMonth;
        });

        const totalTons = yearTrips.reduce((sum, t) => sum + (Number(t['صافي التحميل']) || 0) / 1000, 0);
        const totalTrips = yearTrips.length;

        const yearPop = populationData.filter(p => p.year === selectedYear);
        const totalPopulation = yearPop.reduce((sum, p) => sum + p.population, 0);
        const totalServed = yearPop.reduce((sum, p) => sum + p.served, 0);
        const coverageRate = totalPopulation > 0 ? (totalServed / totalPopulation) * 100 : 0;
        const wastePerCapita = totalPopulation > 0 ? (totalTons * 1000) / totalPopulation / 365 : 0;

        const monthsCount = filters.months.size > 0 ? filters.months.size : 12;
        const totalSalaries = workersData.reduce((sum, w) => sum + (w.salary / 12) * monthsCount, 0);
        const totalFuelCost = vehicleTableData.reduce((sum, v) => sum + v.fuel, 0);
        const totalFuelLiters = vehicleTableData.reduce((sum, v) => sum + (v.fuelLiters || 0), 0);
        const totalMaint = vehicleTableData.reduce((sum, v) => sum + v.maint, 0);

        const currentExtra = additionalCosts.find(c => c.year === selectedYear);
        const extraCosts = currentExtra ? (
            currentExtra.insurance + currentExtra.clothing + currentExtra.cleaning + currentExtra.containers
        ) : 0;

        const totalExpenditures = totalSalaries + totalFuelCost + totalMaint + extraCosts;
        const costPerTon = totalTons > 0 ? totalExpenditures / totalTons : 0;

        const yearRevs = revenuesData.filter(r => r.year === selectedYear);
        const totalRevenue = yearRevs.reduce((sum, r) => sum + r.hhFees + r.commercialFees + r.recyclingRevenue, 0);
        const costRecovery = totalExpenditures > 0 ? (totalRevenue / totalExpenditures) * 100 : 0;

        return {
            totalTons,
            totalTrips,
            totalPopulation,
            totalServed,
            coverageRate,
            wastePerCapita,
            totalSalaries,
            totalFuelCost,
            totalFuelLiters,
            totalMaint,
            extraCosts,
            totalExpenditures,
            costPerTon,
            totalRevenue,
            costRecovery,
            activeVehiclesCount: vehicleTableData.length
        };
    }, [tripsData, selectedYear, filters, populationData, workersData, vehicleTableData, additionalCosts, revenuesData]);

    // Active vehicles filter subtitle
    const filterDescription = useMemo(() => {
        const parts: string[] = [];
        if (filters.vehicles.size > 0) {
            const arr = Array.from(filters.vehicles);
            parts.push(`${isAr ? 'المركبات المحددة' : 'Selected Vehicles'}: ${arr.slice(0, 4).join(', ')}${arr.length > 4 ? ` (+${arr.length - 4})` : ''}`);
        } else {
            parts.push(isAr ? 'كافة مركبات الأسطول' : 'All Fleet Vehicles');
        }

        if (filters.months.size > 0) {
            parts.push(`${isAr ? 'الأشهر' : 'Months'}: ${filters.months.size} ${isAr ? 'أشهر محددة' : 'selected'}`);
        } else {
            parts.push(isAr ? 'كامل أشهر السنة' : 'Full Year');
        }

        if (comparisonYear) {
            parts.push(`${isAr ? 'سنة المقارنة' : 'Comparison Year'}: ${comparisonYear}`);
        }

        return parts.join(' | ');
    }, [filters, comparisonYear, isAr]);

    // Specific chart data: Time Series
    const timeSeriesData = useMemo(() => {
        const monthsMap: { [key: string]: { currentTons: number; compTons: number; currentTrips: number } } = {};
        MONTHS_ORDER.forEach(m => {
            monthsMap[m] = { currentTons: 0, compTons: 0, currentTrips: 0 };
        });

        tripsData.forEach(t => {
            const m = (t['الشهر'] || '').toLowerCase();
            if (!monthsMap[m]) return;
            const matchVeh = filters.vehicles.size === 0 || filters.vehicles.has(t['رقم المركبة']);
            if (!matchVeh) return;

            const tons = (Number(t['صافي التحميل']) || 0) / 1000;
            if (t['السنة'] === selectedYear) {
                monthsMap[m].currentTons += tons;
                monthsMap[m].currentTrips += 1;
            } else if (comparisonYear && t['السنة'] === comparisonYear) {
                monthsMap[m].compTons += tons;
            }
        });

        return MONTHS_ORDER.map(m => ({
            month: m,
            name: m.toUpperCase(),
            tonsCurrent: Math.round(monthsMap[m].currentTons),
            tonsComp: Math.round(monthsMap[m].compTons),
            trips: monthsMap[m].currentTrips
        })).filter(item => item.tonsCurrent > 0 || item.tonsComp > 0);
    }, [tripsData, selectedYear, comparisonYear, filters]);

    // Specific chart data: Fuel YoY (Cost & Liters)
    const fuelChartData = useMemo(() => {
        return vehicleTableData.map(v => {
            return {
                veh: v.veh,
                area: v.area || (isAr ? 'غير محدد' : 'N/A'),
                fuelCost: Math.round(v.fuel),
                fuelLiters: Math.round(v.fuelLiters || 0),
                trips: v.trips,
                tons: Math.round(v.tons)
            };
        }).sort((a, b) => b.fuelCost - a.fuelCost);
    }, [vehicleTableData, isAr]);

    // Workplaces assignment data (Compactors per area per year)
    const compactorWorkplaces = useMemo(() => {
        return areasData.filter(a => !a['السنة'] || a['السنة'] === selectedYear).map(a => {
            const veh = vehicleTableData.find(v => v.veh === a['رقم المركبة']);
            return {
                vehNumber: a['رقم المركبة'],
                area: a['المنطقة'] || (isAr ? 'غير محدد' : 'N/A'),
                year: a['السنة'] || selectedYear,
                trips: veh?.trips || 0,
                tons: veh ? Math.round(veh.tons) : 0,
                fuelLiters: veh ? Math.round(veh.fuelLiters || 0) : 0,
                maintCost: veh ? Math.round(veh.maint) : 0
            };
        });
    }, [areasData, selectedYear, vehicleTableData, isAr]);

    return (
        <div 
            id="management-report-document"
            className="bg-white text-slate-900 p-8 md:p-12 max-w-4xl mx-auto shadow-2xl rounded-2xl border border-slate-200"
            style={{ fontFamily: "'Cairo', sans-serif", direction: isAr ? 'rtl' : 'ltr' }}
        >
            {/* Official Municipal Letterhead */}
            <div className="border-b-2 border-slate-800 pb-6 mb-6">
                <div className="flex items-center justify-between gap-6">
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {isAr ? 'المملكة الأردنية الهاشمية' : 'Hashemite Kingdom of Jordan'}
                        </div>
                        <div className="text-sm font-extrabold text-slate-700">
                            {isAr ? 'وزارة الإدارة المحلية' : 'Ministry of Local Administration'}
                        </div>
                        <div className="text-lg font-black text-blue-900">
                            {isAr ? 'بلدية مؤتة والمزار' : "Mu'tah and Al-Mazar Municipality"}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                            {isAr ? 'شعبة الآليات وإدارة النفايات الصلبة' : 'Fleet & Solid Waste Department'}
                        </div>
                    </div>

                    {/* Official Emblem Badge */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-sky-600 flex items-center justify-center text-white shadow-md border-2 border-amber-400">
                            <span className="text-3xl">🏛️</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Doc Ref: MM-WM-{selectedYear}</span>
                    </div>

                    <div className="text-left">
                        <div className="text-xs font-bold text-slate-500">
                            {isAr ? 'تاريخ التقرير' : 'Report Date'}:
                        </div>
                        <div className="text-sm font-black text-slate-800">{today}</div>
                        <div className="text-xs text-slate-500">{nowTime}</div>
                        <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                            {isAr ? 'وثيقة مراجعة إدارية' : 'Management Review Doc'}
                        </div>
                    </div>
                </div>

                {/* Report Title Banner */}
                <div className="mt-6 text-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-1">
                        {title}
                    </h1>
                    <div className="text-sm font-bold text-blue-800">
                        {isAr ? 'الموجه إلى' : 'Addressed to'}: {recipient}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                        {isAr ? 'الفترة التشغيلية' : 'Operational Period'}: {isAr ? `عام ${selectedYear}` : `Year ${selectedYear}`} | {filterDescription}
                    </div>
                </div>
            </div>

            {/* Section 1: Executive KPI Matrix */}
            {includeKpis && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3 border-r-4 border-blue-600 pr-3">
                        <h2 className="text-base font-black text-slate-800">
                            {isAr ? '١. مؤشرات الأداء والنتائج التشغيلية القياسية (Executive KPIs)' : '1. Executive Performance Indicators'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-100 text-center">
                            <div className="text-xs font-bold text-blue-700">{isAr ? 'إجمالي النفايات المجمعة' : 'Total Waste Collected'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(Math.round(metrics.totalTons))} <span className="text-xs font-normal">{isAr ? 'طن' : 'Tons'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{metrics.totalTrips} {isAr ? 'رحلة تفريغ مكب' : 'trips'}</div>
                        </div>

                        <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-100 text-center">
                            <div className="text-xs font-bold text-emerald-700">{isAr ? 'السكان المخدومين والتغطية' : 'Served Pop & Coverage'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(metrics.totalServed)} <span className="text-xs font-normal">({formatNumber(metrics.coverageRate, 1)}%)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{formatNumber(metrics.totalPopulation)} {isAr ? 'إجمالي السكان' : 'total pop'}</div>
                        </div>

                        <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-100 text-center">
                            <div className="text-xs font-bold text-amber-700">{isAr ? 'استهلاك وقود الأسطول' : 'Total Fleet Fuel'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(metrics.totalFuelLiters)} <span className="text-xs font-normal">{isAr ? 'لتر' : 'L'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{formatNumber(metrics.totalFuelCost)} {isAr ? 'دينار كلفة الوقود' : 'JOD'}</div>
                        </div>

                        <div className="bg-indigo-50/80 rounded-xl p-3 border border-indigo-100 text-center">
                            <div className="text-xs font-bold text-indigo-700">{isAr ? 'إجمالي النفقات والمصاريف' : 'Total Expenditures'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(Math.round(metrics.totalExpenditures))} <span className="text-xs font-normal">{isAr ? 'دينار' : 'JOD'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{isAr ? 'كلفة الطن' : 'Cost/ton'}: {formatNumber(metrics.costPerTon, 1)} {isAr ? 'دينار' : 'JOD'}</div>
                        </div>

                        <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-100 text-center">
                            <div className="text-xs font-bold text-sky-700">{isAr ? 'الإيرادات المحصلة' : 'Revenues Collected'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(Math.round(metrics.totalRevenue))} <span className="text-xs font-normal">{isAr ? 'دينار' : 'JOD'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{isAr ? 'نسبة الاسترداد' : 'Recovery'}: {formatNumber(metrics.costRecovery, 1)}%</div>
                        </div>

                        <div className="bg-purple-50/80 rounded-xl p-3 border border-purple-100 text-center">
                            <div className="text-xs font-bold text-purple-700">{isAr ? 'توليد الفرد اليومي' : 'Per Capita Generation'}</div>
                            <div className="text-lg font-black text-slate-900 mt-1">
                                {formatNumber(metrics.wastePerCapita, 2)} <span className="text-xs font-normal">{isAr ? 'كغم/فرد/يوم' : 'kg/capita/day'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">{isAr ? 'المعيار الوطني: 0.87 كغم' : 'NSWMS Benchmark: 0.87'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section 2: Specific Scope / Charts Content */}
            {scope === 'specific_chart' && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 border-r-4 border-emerald-600 pr-3">
                        <h2 className="text-base font-black text-slate-800">
                            {isAr ? '٢. التحليل البياني المفصل' : '2. Detailed Analytical Visualization'}
                        </h2>
                    </div>

                    {/* Chart: Time Series */}
                    {selectedChart === 'timeseries' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 text-center">
                                    {isAr ? `توزيع أطنان النفايات الشهرية لعام ${selectedYear}${comparisonYear ? ` مقارنة بعام ${comparisonYear}` : ''}` : `Monthly Waste Tons for ${selectedYear}`}
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            <Bar dataKey="tonsCurrent" name={`${isAr ? 'أطنان' : 'Tons'} ${selectedYear}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            {comparisonYear && (
                                                <Bar dataKey="tonsComp" name={`${isAr ? 'أطنان' : 'Tons'} ${comparisonYear}`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                            )}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center border-collapse border border-slate-200">
                                    <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                            <th className="border border-slate-200 p-2">{isAr ? 'الشهر' : 'Month'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? `أطنان النفايات (${selectedYear})` : `Waste Tons (${selectedYear})`}</th>
                                            {comparisonYear && <th className="border border-slate-200 p-2">{isAr ? `أطنان النفايات (${comparisonYear})` : `Waste Tons (${comparisonYear})`}</th>}
                                            <th className="border border-slate-200 p-2">{isAr ? 'عدد الرحلات' : 'Trips'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeSeriesData.map(row => (
                                            <tr key={row.month} className="hover:bg-slate-50">
                                                <td className="border border-slate-200 p-2 font-bold">{row.name}</td>
                                                <td className="border border-slate-200 p-2">{formatNumber(row.tonsCurrent)}</td>
                                                {comparisonYear && <td className="border border-slate-200 p-2">{formatNumber(row.tonsComp)}</td>}
                                                <td className="border border-slate-200 p-2">{row.trips}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Chart: Fuel (Cost & Liters) */}
                    {selectedChart === 'fuel' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 text-center">
                                    {isAr ? `كلف واستهلاك الوقود للآليات (باللتر والدينار) لعام ${selectedYear}` : `Fuel Consumption (Liters & Cost) for ${selectedYear}`}
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={fuelChartData.slice(0, 8)} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="veh" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            <Bar dataKey="fuelLiters" name={isAr ? 'استهلاك اللترات (L)' : 'Liters'} fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="fuelCost" name={isAr ? 'كلفة الوقود (دينار)' : 'Cost (JOD)'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center border-collapse border border-slate-200">
                                    <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                            <th className="border border-slate-200 p-2">{isAr ? 'رقم الضاغطة' : 'Compactor'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? 'منطقة العمل' : 'Workplace Area'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? 'استهلاك اللترات' : 'Liters'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? 'كلفة الوقود (دينار)' : 'Fuel Cost (JOD)'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? 'عدد الرحلات' : 'Trips'}</th>
                                            <th className="border border-slate-200 p-2">{isAr ? 'الحمولة (طن)' : 'Tons'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fuelChartData.map(v => (
                                            <tr key={v.veh} className="hover:bg-slate-50">
                                                <td className="border border-slate-200 p-2 font-bold">{v.veh}</td>
                                                <td className="border border-slate-200 p-2">{v.area}</td>
                                                <td className="border border-slate-200 p-2 font-bold text-emerald-700">{formatNumber(v.fuelLiters)}</td>
                                                <td className="border border-slate-200 p-2 font-bold text-blue-700">{formatNumber(v.fuelCost)}</td>
                                                <td className="border border-slate-200 p-2">{v.trips}</td>
                                                <td className="border border-slate-200 p-2">{formatNumber(v.tons)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Chart: Workplaces & Compactor Assignments */}
                    {selectedChart === 'workplaces' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-sm font-semibold text-blue-900">
                                {isAr ? `توزيع أماكن عمل الضاغطات لعام ${selectedYear} وفقاً للبيانات المحدثة، حيث تم ربط كل ضاغطة بموقع عملها المحدد لكل سنة لضمان دقة الرقابة التشغيلية.` : `Compactor workplace assignments for year ${selectedYear}.`}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center border-collapse border border-slate-200">
                                    <thead className="bg-slate-100 text-slate-800 font-bold">
                                        <tr>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'رقم الضاغطة' : 'Compactor'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'منطقة العمل (حسب السنة)' : 'Workplace Zone'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'السنة' : 'Year'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'الرحلات' : 'Trips'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'النفايات المنقولة (طن)' : 'Tons'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'استهلاك الوقود (لتر)' : 'Fuel Liters'}</th>
                                            <th className="border border-slate-200 p-2.5">{isAr ? 'كلفة الصيانة (دينار)' : 'Maint Cost'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compactorWorkplaces.map(item => (
                                            <tr key={`${item.vehNumber}-${item.year}`} className="hover:bg-slate-50">
                                                <td className="border border-slate-200 p-2 font-black text-slate-900">{item.vehNumber}</td>
                                                <td className="border border-slate-200 p-2 font-bold text-blue-800 bg-blue-50/40">{item.area}</td>
                                                <td className="border border-slate-200 p-2 font-bold">{item.year}</td>
                                                <td className="border border-slate-200 p-2">{item.trips}</td>
                                                <td className="border border-slate-200 p-2">{formatNumber(item.tons)}</td>
                                                <td className="border border-slate-200 p-2 text-emerald-700 font-bold">{formatNumber(item.fuelLiters)}</td>
                                                <td className="border border-slate-200 p-2 text-amber-700 font-bold">{formatNumber(item.maintCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Scope: Full Executive Review Dossier */}
            {scope === 'full_executive' && (
                <div className="space-y-8 mb-8">
                    {/* Part 1: Fleet & Workplaces per year */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 border-r-4 border-indigo-600 pr-3">
                            <h2 className="text-base font-black text-slate-800">
                                {isAr ? '٢. كفاءة الأسطول وأماكن عمل الضاغطات السنوية' : '2. Fleet Workplaces & Compactor Assignments'}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-center border-collapse border border-slate-200">
                                <thead className="bg-slate-100 text-slate-800 font-bold">
                                    <tr>
                                        <th className="border border-slate-200 p-2">{isAr ? 'الضاغطة' : 'Compactor'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'مكان العمل' : 'Workplace Zone'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'السنة' : 'Year'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'الرحلات' : 'Trips'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'الحمولة (طن)' : 'Tons'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'الوقود (لتر)' : 'Fuel Liters'}</th>
                                        <th className="border border-slate-200 p-2">{isAr ? 'الصيانة (دينار)' : 'Maint JOD'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compactorWorkplaces.slice(0, 10).map(item => (
                                        <tr key={`${item.vehNumber}-${item.year}`} className="hover:bg-slate-50">
                                            <td className="border border-slate-200 p-2 font-bold">{item.vehNumber}</td>
                                            <td className="border border-slate-200 p-2 font-bold text-blue-800 bg-blue-50/40">{item.area}</td>
                                            <td className="border border-slate-200 p-2">{item.year}</td>
                                            <td className="border border-slate-200 p-2">{item.trips}</td>
                                            <td className="border border-slate-200 p-2">{formatNumber(item.tons)}</td>
                                            <td className="border border-slate-200 p-2 font-bold text-emerald-700">{formatNumber(item.fuelLiters)}</td>
                                            <td className="border border-slate-200 p-2 font-bold text-amber-700">{formatNumber(item.maintCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Part 2: Financial Position & Cost Recovery */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 border-r-4 border-amber-600 pr-3">
                            <h2 className="text-base font-black text-slate-800">
                                {isAr ? '٣. الموقف المالي الشامل واسترداد الكلف' : '3. Financial Position & Cost Recovery'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <div>
                                <div className="text-xs text-slate-500 font-bold">{isAr ? 'رواتب الكوادر' : 'Staff Salaries'}</div>
                                <div className="text-base font-black text-slate-800">{formatNumber(Math.round(metrics.totalSalaries))} {isAr ? 'دينار' : 'JOD'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold">{isAr ? 'كلف الوقود' : 'Fuel Costs'}</div>
                                <div className="text-base font-black text-slate-800">{formatNumber(Math.round(metrics.totalFuelCost))} {isAr ? 'دينار' : 'JOD'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold">{isAr ? 'كلف الصيانة وقطع الغيار' : 'Maint & Spares'}</div>
                                <div className="text-base font-black text-slate-800">{formatNumber(Math.round(metrics.totalMaint))} {isAr ? 'دينار' : 'JOD'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold">{isAr ? 'التكاليف الإضافية' : 'Extra Costs'}</div>
                                <div className="text-base font-black text-slate-800">{formatNumber(Math.round(metrics.extraCosts))} {isAr ? 'دينار' : 'JOD'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scope: Current View Container (When user wants the exact on-screen view) */}
            {scope === 'current_view' && currentViewHtml && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3 border-r-4 border-blue-600 pr-3">
                        <h2 className="text-base font-black text-slate-800">
                            {isAr ? '٢. مخرجات العرض المباشر للوحة التحكم' : '2. Active Dashboard View Output'}
                        </h2>
                    </div>
                    <div 
                        className="bg-white rounded-2xl border border-slate-200 p-4 overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: currentViewHtml }}
                    />
                </div>
            )}

            {/* Managerial Notes & Recommendations */}
            {notes && (
                <div className="mb-8 bg-amber-50/60 rounded-2xl p-5 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2 text-amber-900 font-black text-sm">
                        <span>📝</span>
                        <span>{isAr ? 'ملاحظات وتوصيات إدارية للمجلس البلدي' : 'Managerial Notes & Council Recommendations'}</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {notes}
                    </p>
                </div>
            )}

            {/* Executive Signatures & Endorsements */}
            {includeSignatures && (
                <div className="border-t-2 border-slate-800 pt-6 mt-8">
                    <div className="text-center font-bold text-xs text-slate-500 mb-6 uppercase tracking-wider">
                        {isAr ? 'اعتماد ومصادقة الإدارة العليا' : 'Official Executive Approvals'}
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="space-y-8">
                            <div className="text-xs font-bold text-slate-700">
                                {isAr ? 'إعداد: رئيس شعبة الآليات' : 'Prepared: Fleet Head'}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold border-b border-dashed border-slate-300 pb-2 mx-4">
                                ....................................
                            </div>
                            <div className="text-[11px] text-slate-500">{isAr ? 'التوقيع والتاريخ' : 'Signature & Date'}</div>
                        </div>

                        <div className="space-y-8">
                            <div className="text-xs font-bold text-slate-700">
                                {isAr ? 'تدقيق: المدير المالي والإداري' : 'Audited: Financial Director'}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold border-b border-dashed border-slate-300 pb-2 mx-4">
                                ....................................
                            </div>
                            <div className="text-[11px] text-slate-500">{isAr ? 'التوقيع والتاريخ' : 'Signature & Date'}</div>
                        </div>

                        <div className="space-y-8">
                            <div className="text-xs font-extrabold text-blue-900">
                                {isAr ? 'مصادقة: عطوفة رئيس البلدية' : 'Approved: Mayor'}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold border-b border-dashed border-slate-300 pb-2 mx-4">
                                ....................................
                            </div>
                            <div className="text-[11px] text-slate-500">{isAr ? 'الختم الرسمي والتوقيع' : 'Official Seal & Signature'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-semibold">
                {isAr 
                    ? 'تم إصدار هذا التقرير آلياً عبر نظام إدارة النفايات الصلبة الذكي | بلدية مؤتة والمزار © 2025' 
                    : 'Generated automatically via Smart Solid Waste Management System | Mutah and Al-Mazar Municipality © 2025'}
            </div>
        </div>
    );
};

export default ManagementReportTemplate;
