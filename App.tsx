
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trip, Vehicle, Fuel, Maintenance, Area, VehicleTableData, DriverStatsData, Population, AreaPopulationStats, Worker, Revenue, WasteTreatment, Distance } from './types';
import { CONFIG, MONTHS_ORDER } from './constants';
import { loadAllData } from './services/dataService';
import { generateFleetReport } from './services/geminiService';
import Header from './components/Header';
import KpiGrid from './components/KpiGrid';
import ChartSection from './components/ChartSection';
import TableSection from './components/TableSection';
import AiAnalysisSection from './components/AiAnalysisSection';
import UtilizationSection from './components/UtilizationSection';
import Loader from './components/Loader';
import AreaChartSection from './components/AreaChartSection';
import AreaIntelligenceSection from './components/AreaIntelligenceSection';
import DriverStatsSection from './components/DriverStatsSection';
import PopulationAnalysisSection from './components/PopulationAnalysisSection';
import SalaryAnalysisSection from './components/SalaryAnalysisSection';
import FinancialManagementSection from './components/FinancialManagementSection';
import AnnualSummarySection from './components/AnnualSummarySection';
import RoutePlanningSection from './components/RoutePlanningSection';
import AiChat from './components/AiChat';
import Sidebar from './components/Sidebar';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent: React.FC = () => {
    const { language, t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [tripsData, setTripsData] = useState<Trip[]>([]);
    const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);
    const [fuelData, setFuelData] = useState<Fuel[]>([]);
    const [maintData, setMaintData] = useState<Maintenance[]>([]);
    const [areasData, setAreasData] = useState<Area[]>([]);
    const [populationData, setPopulationData] = useState<Population[]>([]);
    const [workersData, setWorkersData] = useState<Worker[]>([]);
    const [revenuesData, setRevenuesData] = useState<Revenue[]>([]);
    const [treatmentData, setTreatmentData] = useState<WasteTreatment[]>([]);
    const [distanceData, setDistanceData] = useState<Distance[]>([]);
    
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [comparisonYear, setComparisonYear] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('summary');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [filters, setFilters] = useState<{ vehicles: Set<string>; months: Set<string> }>({
        vehicles: new Set(),
        months: new Set(),
    });
    const [isFiltering, setIsFiltering] = useState(false);

    const [aiReport, setAiReport] = useState<string>('');
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string>('');
    
    const lineChartRef = useRef<HTMLDivElement>(null);
    const pieChartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { trips, vehicles, fuel, maint, areas, population, workers, revenues, treatment, distance } = await loadAllData();
                setTripsData(trips);
                setVehiclesData(vehicles);
                setFuelData(fuel);
                setMaintData(maint);
                setAreasData(areas);
                setPopulationData(population || []);
                setWorkersData(workers || []);
                setRevenuesData(revenues || []);
                setTreatmentData(treatment || []);
                setDistanceData(distance || []);

                const years = [...new Set(trips.map(t => t['السنة']).filter(Boolean))].sort().reverse();
                if (years.length > 0) {
                    setSelectedYear(years[0]);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setLoading(false);
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

    const getVehicleTableData = (trips: Trip[], year: string) => {
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
            const vehRow = vehiclesData.find(x => x['رقم المركبة'] === v) || {};
            const areaRow = areasData.find(x => x['رقم المركبة'] === v && (x['السنة'] === year || !x['السنة'])) || {};
            const fuelRow = fuelData.find(x => x['رقم المركبة'] === v && x['السنة'] === year) || {};
            const maintRow = maintData.find(x => x['رقم المركبة'] === v && x['السنة'] === year) || {};
            const distRow = distanceData.find(x => x['رقم المركبة'] === v && x['السنة'] === year);

            let fuel = 0;
            if(fuelRow) {
                const monthsToSum = filters.months.size > 0 ? Array.from(filters.months) : MONTHS_ORDER;
                monthsToSum.forEach(m => {
                    fuel += (Number(fuelRow[m as keyof Fuel]) || 0);
                });
            }
            
            const maint = Number(maintRow?.['كلفة الصيانة'] || 0);
            const cap_m3 = parseFloat(vehRow['سعة المركبة بالمتر المكعب'] || '0');
            const density = parseFloat(vehRow['كثافة التحميل'] || '0');
            const cap_ton = cap_m3 * density;
            
            // احتساب السعة الفعلية اليومية (طن/يوم)
            const mfgYear = parseInt(vehRow['سنة التصنيع'] || year);
            const age = parseInt(year) - mfgYear;
            let efficiencyRate = 0;
            if (age < 7) efficiencyRate = 1.0;
            else if (age <= 11) efficiencyRate = 0.5;
            else efficiencyRate = 0.0;
            
            // السعة التشغيلية الفعلية اليومية = حجم المركبة (م³) × 1 (رحلة لكل وردية كمرجع) × 0.625 (كثافة) × 0.9 (معدل تحميل) × 0.86 (معدل تشغيل) × معدل الكفاءة
            const actual_daily_cap = cap_m3 * 1 * 0.625 * 0.9 * 0.86 * efficiencyRate;

            const totalCost = fuel + maint;
            const cost_trip = trips ? totalCost / trips : 0;
            const cost_ton = tons ? totalCost / tons : 0;

            const distance = distRow ? (Number(distRow['المسافة المقطوعة (كم)']) || 0) : 0;
            const km_per_trip = trips ? distance / trips : 0;

            return {
                veh: v,
                area: areaRow['المنطقة'] || '',
                drivers: [...drivers].join(', '),
                year: vehRow['سنة التصنيع'] || '',
                cap_m3,
                cap_ton,
                actual_daily_cap,
                trips,
                tons,
                fuel,
                maint,
                cost_trip,
                cost_ton,
                distance,
                km_per_trip
            };
        });
    };

    const filteredVehicleTableData = useMemo<VehicleTableData[]>(() => 
        getVehicleTableData(filteredTrips, selectedYear), 
    [filteredTrips, vehiclesData, areasData, fuelData, maintData, filters.months, selectedYear, distanceData]);

    const comparisonVehicleTableData = useMemo<VehicleTableData[]>(() => 
        comparisonYear ? getVehicleTableData(comparisonTrips, comparisonYear) : [], 
    [comparisonTrips, vehiclesData, areasData, fuelData, maintData, filters.months, comparisonYear, distanceData]);

    // Added logic for AI report generation
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

    // Added return statement for AppContent to handle tab navigation and rendering
    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? (language === 'ar' ? 'mr-72' : 'ml-72') : (language === 'ar' ? 'mr-20' : 'ml-20')}`}>
                <Header 
                    tripsData={tripsData} filters={filters} selectedYear={selectedYear} 
                    comparisonYear={comparisonYear} activeTab={activeTab} onYearChange={handleYearChange} 
                    onComparisonYearChange={handleComparisonYearChange} onFilterToggle={handleFilterToggle} onResetFilters={resetFilters} 
                />
                
                {loading || isFiltering ? <Loader /> : (
                    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                        {activeTab === 'summary' && (
                            <AnnualSummarySection 
                                filteredTrips={filteredTrips} 
                                treatment={treatmentData.find(t => t.year === selectedYear)} 
                                populationData={populationData} workers={workersData} 
                                revenues={revenuesData} vehicleTableData={filteredVehicleTableData} 
                                selectedYear={selectedYear} filters={filters} 
                            />
                        )}
                        {activeTab === 'kpi' && (
                            <KpiGrid 
                                filteredTrips={filteredTrips} comparisonTrips={comparisonTrips} 
                                fuelData={fuelData} maintData={maintData} filters={filters} 
                                selectedYear={selectedYear} comparisonYear={comparisonYear} 
                                vehicleTableData={filteredVehicleTableData} comparisonVehicleTableData={comparisonVehicleTableData}
                                workers={workersData}
                            />
                        )}
                        {activeTab === 'charts' && (
                            <ChartSection data={filteredTrips} comparisonData={comparisonTrips} isLoading={loading} filters={filters} selectedYear={selectedYear} comparisonYear={comparisonYear} chartRef={lineChartRef} />
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
                        {activeTab === 'utilization' && (
                            <UtilizationSection tableData={filteredVehicleTableData} filters={filters} />
                        )}
                        {activeTab === 'salaries' && (
                            <SalaryAnalysisSection workers={workersData} filters={filters} />
                        )}
                        {activeTab === 'financial' && (
                            <FinancialManagementSection workers={workersData} vehicleData={filteredVehicleTableData} selectedYear={selectedYear} filters={filters} />
                        )}
                        {activeTab === 'intelligence' && (
                            <AreaIntelligenceSection workers={workersData} vehicleData={filteredVehicleTableData} population={populationData} selectedYear={selectedYear} filters={filters} />
                        )}
                        {activeTab === 'route_planning' && (
                            <RoutePlanningSection vehicles={filteredVehicleTableData} />
                        )}
                        {activeTab === 'population' && (
                            <PopulationAnalysisSection tableData={[]} filters={filters} />
                        )}
                    </div>
                )}
                <AiChat currentData={filteredVehicleTableData} comparisonData={comparisonVehicleTableData} selectedYear={selectedYear} comparisonYear={comparisonYear} />
            </main>
        </div>
    );
};

// Added App component to provide necessary contexts and export as default
const App: React.FC = () => (
    <ThemeProvider>
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    </ThemeProvider>
);

export default App;
