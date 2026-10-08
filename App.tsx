
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trip, Vehicle, Fuel, Maintenance, Area, VehicleTableData, DriverStatsData, Population, AreaPopulationStats, Worker, Revenue, WasteTreatment, Distance, AdditionalCost, MaintenanceRecord } from './types';
import { CONFIG, MONTHS_ORDER } from './constants';
import { loadAllData } from './services/dataService';
import { generateFleetReport } from './services/geminiService';
import Header from './components/Header';
import KpiGrid from './components/KpiGrid';
import ChartSection from './components/ChartSection';
import TableSection from './components/TableSection';
import AiAnalysisSection from './components/AiAnalysisSection';
import Loader from './components/Loader';
import AreaIntelligenceSection from './components/AreaIntelligenceSection';
import DriverStatsSection from './components/DriverStatsSection';
import PopulationAnalysisSection from './components/PopulationAnalysisSection';
import SalaryAnalysisSection from './components/SalaryAnalysisSection';
import FinancialManagementSection from './components/FinancialManagementSection';
import AnnualSummarySection from './components/AnnualSummarySection';
import RoutePlanningSection from './components/RoutePlanningSection';
import MaintenanceAnalysisSection from './components/MaintenanceAnalysisSection';
import FuelAnalysisSection from './components/FuelAnalysisSection';
import OperationalPerformanceSection from './components/OperationalPerformanceSection';
import AiChat from './components/AiChat';
import Sidebar from './components/Sidebar';
import ManagementReportModal from './components/ManagementReportModal';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent: React.FC = () => {
    const { language, t } = useLanguage();
    const [loading, setStatusLoading] = useState(true);
    const [tripsData, setTripsData] = useState<Trip[]>([]);
    const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);
    const [fuelData, setFuelData] = useState<Fuel[]>([]);
    const [fuelLitersData, setFuelLitersData] = useState<Fuel[]>([]);
    const [maintData, setMaintData] = useState<Maintenance[]>([]);
    const [maintRecords, setMaintRecords] = useState<MaintenanceRecord[]>([]);
    const [areasData, setAreasData] = useState<Area[]>([]);
    const [populationData, setPopulationData] = useState<Population[]>([]);
    const [workersData, setWorkersData] = useState<Worker[]>([]);
    const [revenuesData, setRevenuesData] = useState<Revenue[]>([]);
    const [treatmentData, setTreatmentData] = useState<WasteTreatment[]>([]);
    const [distanceData, setDistanceData] = useState<Distance[]>([]);
    const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
    
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [comparisonYear, setComparisonYear] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('summary');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    const [filters, setFilters] = useState<{ vehicles: Set<string>; months: Set<string> }>({
        vehicles: new Set(),
        months: new Set(),
    });
    const [isFiltering, setIsFiltering] = useState(false);

    const [aiReport, setAiReport] = useState<string>('');
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string>('');
    
    // Management PDF Report state
    const [isManagementReportOpen, setIsManagementReportOpen] = useState(false);
    const [managementReportScope, setManagementReportScope] = useState<'current_view' | 'specific_chart' | 'full_executive'>('full_executive');
    const [managementReportChart, setManagementReportChart] = useState<string>('timeseries');

    const handleOpenManagementReport = (
        scope: 'current_view' | 'specific_chart' | 'full_executive' = 'full_executive',
        chart: string = 'timeseries'
    ) => {
        setManagementReportScope(scope);
        setManagementReportChart(chart);
        setIsManagementReportOpen(true);
    };

    const lineChartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setStatusLoading(true);
            try {
                const data = await loadAllData();
                setTripsData(data.trips);
                setVehiclesData(data.vehicles);
                setFuelData(data.fuel);
                setFuelLitersData(data.fuelLiters || []);
                setMaintData(data.maint);
                setMaintRecords(data.maintRecords || []);
                setAreasData(data.areas);
                setPopulationData(data.population || []);
                setWorkersData(data.workers || []);
                setRevenuesData(data.revenues || []);
                setTreatmentData(data.treatment || []);
                setDistanceData(data.distance || []);
                setAdditionalCosts(data.additionalCosts || []);

                const years = [...new Set(data.trips.map(t => t['السنة']).filter(Boolean))].sort().reverse();
                if (years.length > 0) {
                    setSelectedYear(years[0]);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setStatusLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleYearChange = (year: string) => {
        setIsFiltering(true);
        setSelectedYear(year);
    };

    const handleComparisonYearChange = (year: string) => {
        setIsFiltering(true);
        setComparisonYear(year);
    };

    const handleFilterToggle = useCallback((type: 'vehicles' | 'months', value: string) => {
        setIsFiltering(true);
        setFilters(prev => {
            const newSet = new Set(prev[type]);
            if (newSet.has(value)) {
                newSet.delete(value);
            } else {
                newSet.add(value);
            }
            return { ...prev, [type]: newSet };
        });
    }, []);

    const resetFilters = useCallback(() => {
        setIsFiltering(true);
        setFilters({ vehicles: new Set(), months: new Set() });
        setComparisonYear('');
    }, []);

    const filteredTrips = useMemo(() => {
        let data = tripsData.filter(r => r['السنة'] === selectedYear);
        if (filters.vehicles.size > 0) {
            data = data.filter(r => r['رقم المركبة'] && filters.vehicles.has(r['رقم المركبة']));
        }
        if (filters.months.size > 0) {
            data = data.filter(r => r['الشهر'] && filters.months.has(r['الشهر'].toLowerCase()));
        }
        return data;
    }, [tripsData, selectedYear, filters]);

    const comparisonTrips = useMemo(() => {
        if (!comparisonYear) return [];
        let data = tripsData.filter(r => r['السنة'] === comparisonYear);
        if (filters.vehicles.size > 0) {
            data = data.filter(r => r['رقم المركبة'] && filters.vehicles.has(r['رقم المركبة']));
        }
        if (filters.months.size > 0) {
            data = data.filter(r => r['الشهر'] && filters.months.has(r['الشهر'].toLowerCase()));
        }
        return data;
    }, [tripsData, comparisonYear, filters]);

    useEffect(() => {
        if (isFiltering) {
            const timer = setTimeout(() => setIsFiltering(false), 300);
            return () => clearTimeout(timer);
        }
    }, [filteredTrips, isFiltering]);
    
    const allVehiclesList = useMemo(() => {
        return [...new Set(tripsData.map(r => r['رقم المركبة']).filter(Boolean))].sort();
    }, [tripsData]);

    const getVehicleArea = useCallback((vehId: string, targetYear?: string): string => {
        const cleanVeh = String(vehId || '').trim();
        const cleanYear = String(targetYear || '').trim();
        if (!cleanVeh) return '';

        // 1. Exact match for vehicle and year
        if (cleanYear) {
            const exact = areasData.find(x => 
                String(x['رقم المركبة'] || '').trim() === cleanVeh && 
                String(x['السنة'] || '').trim() === cleanYear
            );
            if (exact && exact['المنطقة']) {
                return String(exact['المنطقة']).trim();
            }
        }

        // 2. Match vehicle with empty year (unspecified / universal)
        const noYearMatch = areasData.find(x => 
            String(x['رقم المركبة'] || '').trim() === cleanVeh && 
            !String(x['السنة'] || '').trim()
        );
        if (noYearMatch && noYearMatch['المنطقة']) {
            return String(noYearMatch['المنطقة']).trim();
        }

        // 3. Fallback to latest entry available for this vehicle
        const matches = areasData.filter(x => 
            String(x['رقم المركبة'] || '').trim() === cleanVeh &&
            Boolean(String(x['المنطقة'] || '').trim())
        );
        if (matches.length > 0) {
            return String(matches[matches.length - 1]['المنطقة'] || '').trim();
        }

        return '';
    }, [areasData]);

    const getVehicleTableData = useCallback((trips: Trip[], year: string) => {
        const vehGroups: { [key: string]: { trips: number; tons: number; drivers: Set<string> } } = {};
        
        trips.forEach(r => {
            const v = r['رقم المركبة'];
            if (!v) return;
            if (!vehGroups[v]) vehGroups[v] = { trips: 0, tons: 0, drivers: new Set() };
            vehGroups[v].trips += 1;
            vehGroups[v].tons += (Number(r['صافي التحميل']) || 0) / 1000;
            if (r['السائق']) vehGroups[v].drivers.add(r['السائق']);
        });

        return Object.keys(vehGroups).map(v => {
            const { trips, tons, drivers } = vehGroups[v];
            const cleanVeh = v.trim();
            const vehRow = vehiclesData.find(x => String(x['رقم المركبة'] || '').trim() === cleanVeh) || {};
            const assignedArea = getVehicleArea(cleanVeh, year);
            const fuelRow = fuelData.find(x => String(x['رقم المركبة'] || '').trim() === cleanVeh && String(x['السنة'] || '').trim() === year) || {};
            const fuelLitersRow = fuelLitersData.find(x => String(x['رقم المركبة'] || '').trim() === cleanVeh && String(x['السنة'] || '').trim() === year) || {};
            const vehicleMaint = maintData.filter(x => String(x['رقم المركبة'] || '').trim() === cleanVeh && String(x['السنة'] || '').trim() === year);
            const distRow = distanceData.find(x => String(x['رقم المركبة'] || '').trim() === cleanVeh && String(x['السنة'] || '').trim() === year);

            let fuel = 0;
            let fuelLiters = 0;
            const monthsToSum = filters.months.size > 0 ? Array.from(filters.months) : MONTHS_ORDER;
            
            if(fuelRow) {
                monthsToSum.forEach(m => {
                    fuel += (Number(fuelRow[m as keyof Fuel]) || 0);
                });
            }
            if(fuelLitersRow) {
                monthsToSum.forEach(m => {
                    fuelLiters += (Number(fuelLitersRow[m as keyof Fuel]) || 0);
                });
            }
            
            let maint = 0;
            if (filters.months.size > 0) {
                vehicleMaint.forEach(m => {
                    if (m['الشهر'] && filters.months.has(m['الشهر'].toLowerCase())) {
                        maint += Number(m['كلفة الصيانة'] || 0);
                    }
                });
            } else {
                vehicleMaint.forEach(m => {
                    maint += Number(m['كلفة الصيانة'] || 0);
                });
            }
            const cap_m3 = parseFloat(vehRow['سعة المركبة بالمتر المكعب'] || '0');
            const density = parseFloat(vehRow['كثافة التحميل'] || '0');
            const cap_ton = cap_m3 * density;
            const mfgYear = parseInt(vehRow['سنة التصنيع'] || year);
            const age = parseInt(year) - mfgYear;
            let efficiencyRate = age < 7 ? 1.0 : (age <= 11 ? 0.5 : 0.0);
            const actual_daily_cap = cap_m3 * 1 * 0.625 * 0.9 * 0.86 * efficiencyRate;
            const totalCost = fuel + maint;
            const cost_trip = trips ? totalCost / trips : 0;
            const cost_ton = tons ? totalCost / tons : 0;
            
            const liters_per_trip = trips ? fuelLiters / trips : 0;
            const liters_per_ton = tons ? fuelLiters / tons : 0;

            const distance = distRow ? (Number(distRow['المسافة المقطوعة (كم)']) || 0) : 0;
            const km_per_trip = trips ? distance / trips : 0;

            return {
                veh: v, area: assignedArea || '', drivers: [...drivers].join(', '), year: vehRow['سنة التصنيع'] || '',
                cap_m3, cap_ton, actual_daily_cap, trips, tons, fuel, fuelLiters, maint, cost_trip, cost_ton, distance, km_per_trip,
                liters_per_trip, liters_per_ton
            };
        });
    }, [vehiclesData, getVehicleArea, fuelData, fuelLitersData, maintData, distanceData, filters.months]);

    const filteredVehicleTableData = useMemo<VehicleTableData[]>(() => 
        getVehicleTableData(filteredTrips, selectedYear), 
    [getVehicleTableData, filteredTrips, selectedYear]);

    const comparisonVehicleTableData = useMemo<VehicleTableData[]>(() => 
        comparisonYear ? getVehicleTableData(comparisonTrips, comparisonYear) : [], 
    [getVehicleTableData, comparisonTrips, comparisonYear]);

    const driverStatsData = useMemo<DriverStatsData[]>(() => {
        const groups: { [key: string]: { trips: number; tons: number; vehicles: Set<string> } } = {};
        filteredTrips.forEach(t => {
            const driver = t['السائق'] || 'غير محدد';
            const veh = t['رقم المركبة'] || 'غير معروف';
            const tons = (Number(t['صافي التحميل']) || 0) / 1000;
            if (!groups[driver]) groups[driver] = { trips: 0, tons: 0, vehicles: new Set() };
            groups[driver].trips += 1;
            groups[driver].tons += tons;
            groups[driver].vehicles.add(veh);
        });
        return Object.keys(groups).map(driver => {
            const { trips, tons, vehicles } = groups[driver];
            return {
                driver,
                trips,
                tons,
                avgTonsPerTrip: trips > 0 ? tons / trips : 0,
                vehicles: Array.from(vehicles).join(', ')
            };
        });
    }, [filteredTrips]);

    const currentAdditionalCosts = useMemo(() => {
        return additionalCosts.find(c => c.year === selectedYear) || null;
    }, [additionalCosts, selectedYear]);

    const currentRevenueDetail = useMemo(() => {
        const yearData = revenuesData.filter(r => r.year === selectedYear);
        const hh = yearData.reduce((sum, r) => sum + r.hhFees, 0);
        const commercial = yearData.reduce((sum, r) => sum + r.commercialFees, 0);
        const recycling = yearData.reduce((sum, r) => sum + r.recyclingRevenue, 0);
        return { total: hh + commercial + recycling, hh, commercial, recycling };
    }, [revenuesData, selectedYear]);

    const comparisonRevenueDetail = useMemo(() => {
        if (!comparisonYear) return null;
        const yearData = revenuesData.filter(r => r.year === comparisonYear);
        const hh = yearData.reduce((sum, r) => sum + r.hhFees, 0);
        const commercial = yearData.reduce((sum, r) => sum + r.commercialFees, 0);
        const recycling = yearData.reduce((sum, r) => sum + r.recyclingRevenue, 0);
        return { total: hh + commercial + recycling, hh, commercial, recycling };
    }, [revenuesData, comparisonYear]);

    const areaPopulationStats = useMemo<AreaPopulationStats[]>(() => {
        const tonsByArea: { [key: string]: number } = {};
        filteredTrips.forEach(trip => {
            const vehicleId = (trip['رقم المركبة'] || '').trim();
            let area = getVehicleArea(vehicleId, selectedYear) || 'غير محدد';
            if (area === 'مؤتة') area = 'مؤته';
            tonsByArea[area] = (tonsByArea[area] || 0) + (Number(trip['صافي التحميل'] || 0) / 1000);
        });
        const popDataForYear = populationData.filter(p => p.year === selectedYear);
        return popDataForYear.map(pop => {
            let areaName = pop.area.trim();
            if (areaName === 'مؤتة') areaName = 'مؤته';
            const tons = tonsByArea[areaName] || 0;
            const population = pop.population || 0;
            const served = pop.served || 0;
            return {
                area: areaName, population, served, totalTons: tons,
                kgPerCapita: population > 0 ? (tons * 1000) / population : 0,
                coverageRate: population > 0 ? (served / population) * 100 : 0
            };
        }).sort((a, b) => b.kgPerCapita - a.kgPerCapita);
    }, [filteredTrips, populationData, selectedYear, getVehicleArea]);

    const populationTotals = useMemo(() => {
        let targetData = areaPopulationStats;
        if (filters.vehicles.size > 0) {
            const activeAreas = new Set(filteredVehicleTableData.map(v => v.area));
            targetData = areaPopulationStats.filter(p => activeAreas.has(p.area));
        }
        const totalPop = targetData.reduce((sum, item) => sum + item.population, 0);
        const totalServed = targetData.reduce((sum, item) => sum + item.served, 0);
        return { totalPop, totalServed, coverageRate: totalPop > 0 ? (totalServed / totalPop) * 100 : 0 };
    }, [areaPopulationStats, filters.vehicles, filteredVehicleTableData]);

    const handleGenerateReport = async (analysisType: string, options: any) => {
        setAiLoading(true);
        setAiError('');
        try {
            const report = await generateFleetReport(filteredVehicleTableData, analysisType, options, language);
            setAiReport(report);
        } catch (err: any) {
            setAiError(err.message || 'Error generating report');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 flex ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} overflow-x-hidden relative`}>
            {/* Background Image Layer */}
            <div 
                className="fixed inset-0 z-[-2]"
                style={{
                    backgroundImage: "url('/dashboard-bg.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            />
            {/* Overlay Layer (Light/Dark mode responsive) */}
            <div className="fixed inset-0 z-[-1] bg-slate-50/90 dark:bg-slate-950/85 transition-colors duration-300 backdrop-blur-[2px]" />

            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className={`flex-1 w-full min-w-0 transition-all duration-300 ${isSidebarOpen ? (language === 'ar' ? 'md:mr-72' : 'md:ml-72') : (language === 'ar' ? 'md:mr-20' : 'md:ml-20')}`}>
                <Header 
                    tripsData={tripsData} filters={filters} selectedYear={selectedYear} 
                    comparisonYear={comparisonYear} activeTab={activeTab} onYearChange={handleYearChange} 
                    onComparisonYearChange={handleComparisonYearChange} onFilterToggle={handleFilterToggle} onResetFilters={resetFilters} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenManagementReport={() => handleOpenManagementReport('full_executive')}
                />
                
                {loading || isFiltering ? <Loader /> : (
                    <div id="current-dashboard-view" className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                        {activeTab === 'summary' && (
                            <AnnualSummarySection 
                                filteredTrips={filteredTrips} 
                                treatment={treatmentData.find(t => t.year === selectedYear)} 
                                populationData={populationData} workers={workersData} 
                                revenues={revenuesData} vehicleTableData={filteredVehicleTableData} 
                                selectedYear={selectedYear} filters={filters} 
                                additionalCosts={currentAdditionalCosts}
                            />
                        )}
                        {activeTab === 'kpi' && (
                            <KpiGrid 
                                filteredTrips={filteredTrips} comparisonTrips={comparisonTrips} 
                                fuelData={fuelData} maintData={maintData} filters={filters} 
                                selectedYear={selectedYear} comparisonYear={comparisonYear} 
                                vehicleTableData={filteredVehicleTableData} comparisonVehicleTableData={comparisonVehicleTableData}
                                totalPopulation={populationTotals.totalPop}
                                totalServed={populationTotals.totalServed}
                                coverageRate={populationTotals.coverageRate}
                                workers={workersData}
                                revenueDetail={currentRevenueDetail}
                                comparisonRevenueDetail={comparisonRevenueDetail}
                                additionalCosts={currentAdditionalCosts}
                                comparisonAdditionalCosts={additionalCosts.find(c => c.year === comparisonYear) || null}
                            />
                        )}
                        {activeTab === 'charts' && (
                            <ChartSection data={filteredTrips} comparisonData={comparisonTrips} isLoading={false} filters={filters} selectedYear={selectedYear} comparisonYear={comparisonYear} chartRef={lineChartRef} />
                        )}
                        {activeTab === 'ai' && (
                            <AiAnalysisSection 
                                vehicles={allVehiclesList} onGenerateReport={handleGenerateReport} 
                                report={aiReport} isLoading={aiLoading} error={aiError} filters={filters} 
                            />
                        )}
                        {activeTab === 'vehicles' && (
                            <TableSection tableData={filteredVehicleTableData} filters={filters} />
                        )}
                        {activeTab === 'salaries' && (
                            <SalaryAnalysisSection workers={workersData} filters={filters} />
                        )}
                        {activeTab === 'financial' && (
                            <FinancialManagementSection 
                                workers={workersData} 
                                vehicleData={filteredVehicleTableData} 
                                additionalCosts={additionalCosts} 
                                revenues={revenuesData}
                                selectedYear={selectedYear} 
                                comparisonYear={comparisonYear}
                                filters={filters} 
                            />
                        )}
                        {activeTab === 'intelligence' && (
                            <AreaIntelligenceSection 
                                workers={workersData} 
                                vehicleData={filteredVehicleTableData} 
                                population={populationData.filter(p => p.year === selectedYear)} 
                                selectedYear={selectedYear} 
                                areasData={areasData}
                                filters={filters} 
                            />
                        )}
                        {activeTab === 'route_planning' && (
                            <RoutePlanningSection 
                                vehicles={filteredVehicleTableData} 
                                selectedYear={selectedYear}
                            />
                        )}
                        {activeTab === 'maint_analysis' && (
                            <MaintenanceAnalysisSection 
                                maintRecords={maintRecords}
                                selectedYear={selectedYear}
                                comparisonYear={comparisonYear}
                                onComparisonYearChange={handleComparisonYearChange}
                                filters={filters}
                            />
                        )}
                        {activeTab === 'fuel_analysis' && (
                            <FuelAnalysisSection
                                fuelData={fuelData}
                                fuelLitersData={fuelLitersData}
                                vehicleData={filteredVehicleTableData}
                                selectedYear={selectedYear}
                                comparisonYear={comparisonYear}
                                onComparisonYearChange={handleComparisonYearChange}
                                filters={filters}
                            />
                        )}
                        {activeTab === 'op_perf' && (
                            <OperationalPerformanceSection 
                                distanceData={distanceData}
                                maintData={maintData}
                                fuelData={fuelData}
                                fuelLitersData={fuelLitersData}
                                tripsData={tripsData}
                                filters={filters}
                                selectedYear={selectedYear}
                            />
                        )}
                        {activeTab === 'population' && (
                            <PopulationAnalysisSection tableData={areaPopulationStats} filters={filters} />
                        )}
                        {activeTab === 'drivers' && (
                            <DriverStatsSection tableData={driverStatsData} filters={filters} />
                        )}
                    </div>
                )}
                <AiChat currentData={filteredVehicleTableData} comparisonData={comparisonVehicleTableData} selectedYear={selectedYear} comparisonYear={comparisonYear} />

                {/* Floating Quick Action for Management PDF Export */}
                <button
                    onClick={() => handleOpenManagementReport('full_executive')}
                    className="fixed bottom-6 start-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold px-4 py-3 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-amber-300/30 cursor-pointer"
                    title={t('export_management_pdf')}
                >
                    <span className="text-xl">📄</span>
                    <span className="text-xs md:text-sm font-black">{t('management_report')}</span>
                </button>

                {/* Management Report PDF Modal */}
                <ManagementReportModal
                    isOpen={isManagementReportOpen}
                    onClose={() => setIsManagementReportOpen(false)}
                    selectedYear={selectedYear}
                    comparisonYear={comparisonYear}
                    filters={filters}
                    tripsData={tripsData}
                    vehicleTableData={filteredVehicleTableData}
                    fuelData={fuelData}
                    fuelLitersData={fuelLitersData}
                    maintData={maintData}
                    workersData={workersData}
                    revenuesData={revenuesData}
                    populationData={populationData}
                    additionalCosts={additionalCosts}
                    areasData={areasData}
                    activeTab={activeTab}
                    initialScope={managementReportScope}
                    initialChart={managementReportChart}
                />
            </main>
        </div>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    </ThemeProvider>
);

export default App;
