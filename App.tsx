
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trip, Vehicle, Fuel, Maintenance, Area, VehicleTableData, DriverStatsData, Population, AreaPopulationStats, Worker } from './types';
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
import AiChat from './components/AiChat';

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [tripsData, setTripsData] = useState<Trip[]>([]);
    const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);
    const [fuelData, setFuelData] = useState<Fuel[]>([]);
    const [maintData, setMaintData] = useState<Maintenance[]>([]);
    const [areasData, setAreasData] = useState<Area[]>([]);
    const [populationData, setPopulationData] = useState<Population[]>([]);
    const [workersData, setWorkersData] = useState<Worker[]>([]);
    
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [comparisonYear, setComparisonYear] = useState<string>('');

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
                const { trips, vehicles, fuel, maint, areas, population, workers } = await loadAllData();
                setTripsData(trips);
                setVehiclesData(vehicles);
                setFuelData(fuel);
                setMaintData(maint);
                setAreasData(areas);
                setPopulationData(population || []);
                setWorkersData(workers || []);

                // استخراج السنوات المتاحة واختيار الأحدث تلقائياً
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
            const totalCost = fuel + maint;
            const cost_trip = trips ? totalCost / trips : 0;
            const cost_ton = tons ? totalCost / tons : 0;

            return {
                veh: v,
                area: areaRow['المنطقة'] || '',
                drivers: [...drivers].join(', '),
                year: vehRow['سنة التصنيع'] || '',
                cap_m3,
                cap_ton,
                trips,
                tons,
                fuel,
                maint,
                cost_trip,
                cost_ton,
            };
        });
    };

    const filteredVehicleTableData = useMemo<VehicleTableData[]>(() => 
        getVehicleTableData(filteredTrips, selectedYear), 
    [filteredTrips, vehiclesData, areasData, fuelData, maintData, filters.months, selectedYear]);

    const comparisonVehicleTableData = useMemo<VehicleTableData[]>(() => 
        comparisonYear ? getVehicleTableData(comparisonTrips, comparisonYear) : [], 
    [comparisonTrips, vehiclesData, areasData, fuelData, maintData, filters.months, comparisonYear]);

    const driverStatsData = useMemo<DriverStatsData[]>(() => {
        const driverGroups: { [key: string]: { trips: number; tons: number; vehicles: Set<string> } } = {};
        
        filteredTrips.forEach(r => {
            const driver = r['السائق'];
            if (!driver || driver.trim() === '') return;
    
            if (!driverGroups[driver]) {
                driverGroups[driver] = { trips: 0, tons: 0, vehicles: new Set() };
            }
            driverGroups[driver].trips += 1;
            driverGroups[driver].tons += (Number(r['صافي التحميل']) || 0) / 1000;
            if (r['رقم المركبة']) {
                driverGroups[driver].vehicles.add(r['رقم المركبة']);
            }
        });
    
        return Object.entries(driverGroups).map(([driver, data]) => {
            const { trips, tons, vehicles } = data;
            const avgTonsPerTrip = trips > 0 ? tons / trips : 0;
            
            return {
                driver,
                trips,
                tons,
                avgTonsPerTrip,
                vehicles: [...vehicles].join(', '),
            };
        });
    }, [filteredTrips]);
    
    const areaDistributionData = useMemo(() => {
        const areaMap = new Map<string, string>();
        areasData.forEach(a => {
            if (a['رقم المركبة'] && a['المنطقة'] && (a['السنة'] === selectedYear || !a['السنة'])) {
                areaMap.set(a['رقم المركبة'], a['المنطقة']);
            }
        });

        const tonsByArea: { [key: string]: number } = {};
        filteredTrips.forEach(trip => {
            const vehicleId = trip['رقم المركبة'];
            if (vehicleId) {
                const area = areaMap.get(vehicleId) || 'غير محدد';
                if (!tonsByArea[area]) {
                    tonsByArea[area] = 0;
                }
                tonsByArea[area] += (Number(trip['صافي التحميل'] || 0) / 1000);
            }
        });

        return Object.entries(tonsByArea)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);

    }, [filteredTrips, areasData, selectedYear]);

    const areaPopulationStats = useMemo<AreaPopulationStats[]>(() => {
        const vehAreaMap = new Map<string, string>();
        areasData.forEach(a => {
            if (a['رقم المركبة'] && a['المنطقة'] && (a['السنة'] === selectedYear || !a['السنة'])) {
                vehAreaMap.set(a['رقم المركبة'].trim(), a['المنطقة'].trim());
            }
        });

        const tonsByArea: { [key: string]: number } = {};
        filteredTrips.forEach(trip => {
            const vehicleId = (trip['رقم المركبة'] || '').trim();
            const area = vehAreaMap.get(vehicleId) || 'غير محدد';
            tonsByArea[area] = (tonsByArea[area] || 0) + (Number(trip['صافي التحميل'] || 0) / 1000);
        });

        return populationData.map(pop => {
            const areaName = pop.area.trim();
            const tons = tonsByArea[areaName] || 0;
            const population = pop.population || 0;
            // تحويل الأطنان إلى كيلوغرامات (طن * 1000) لحساب نصيب الفرد بالكغم
            const kgPerCapita = population > 0 ? (tons * 1000) / population : 0;
            return {
                area: areaName,
                population,
                totalTons: tons,
                kgPerCapita
            };
        }).sort((a, b) => b.kgPerCapita - a.kgPerCapita);
    }, [filteredTrips, areasData, populationData, selectedYear]);

    const totalPopulation = useMemo(() => {
        if (!populationData || !populationData.length) return 0;
        return populationData.reduce((sum, item) => sum + item.population, 0);
    }, [populationData]);

    const handleGenerateReport = async (analysisType: string, options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string }) => {
        setAiLoading(true);
        setAiError('');
        setAiReport('');
        try {
            const report = await generateFleetReport(filteredVehicleTableData, analysisType, options);
            setAiReport(report);
        } catch (err) {
            setAiError('حدث خطأ أثناء إنشاء التقرير. يرجى المحاولة مرة أخرى.');
            console.error(err);
        } finally {
            setAiLoading(false);
        }
    };


    if (loading) {
        return <Loader />;
    }

    return (
        <div className="bg-slate-50 text-slate-800 min-h-screen">
            <Header
                tripsData={tripsData}
                filters={filters}
                selectedYear={selectedYear}
                comparisonYear={comparisonYear}
                onYearChange={handleYearChange}
                onComparisonYearChange={handleComparisonYearChange}
                onFilterToggle={handleFilterToggle}
                onResetFilters={resetFilters}
            />
            <main className="container mx-auto p-4 md:p-6 pb-24 text-right">
                <KpiGrid 
                    filteredTrips={filteredTrips} 
                    comparisonTrips={comparisonTrips}
                    fuelData={fuelData} 
                    maintData={maintData} 
                    filters={filters}
                    selectedYear={selectedYear}
                    comparisonYear={comparisonYear}
                    vehicleTableData={filteredVehicleTableData}
                    comparisonVehicleTableData={comparisonVehicleTableData}
                    totalPopulation={totalPopulation}
                    workers={workersData}
                />
                
                <ChartSection 
                    data={filteredTrips} 
                    comparisonData={comparisonTrips}
                    isLoading={isFiltering} 
                    filters={filters} 
                    selectedYear={selectedYear}
                    comparisonYear={comparisonYear}
                    chartRef={lineChartRef} 
                />

                {/* مركز الإدارة المالية المتكامل */}
                <FinancialManagementSection 
                    workers={workersData} 
                    vehicleData={filteredVehicleTableData} 
                    selectedYear={selectedYear} 
                />

                {/* مركز استخبارات المناطق */}
                <AreaIntelligenceSection 
                    workers={workersData} 
                    vehicleData={filteredVehicleTableData} 
                    population={populationData}
                    selectedYear={selectedYear}
                />
                
                <AreaChartSection data={areaDistributionData} isLoading={isFiltering} filters={filters} chartRef={pieChartRef} />
                
                <PopulationAnalysisSection tableData={areaPopulationStats} filters={filters} />

                <SalaryAnalysisSection workers={workersData} />

                <TableSection tableData={filteredVehicleTableData} filters={filters} title={`كفاءة المركبات - سنة ${selectedYear}`} />
                
                {comparisonYear && (
                    <TableSection tableData={comparisonVehicleTableData} filters={filters} title={`كفاءة المركبات - سنة ${comparisonYear} (للمقارنة)`} />
                )}

                <DriverStatsSection tableData={driverStatsData} filters={filters} />
                <AiAnalysisSection
                    vehicles={allVehiclesList}
                    onGenerateReport={handleGenerateReport}
                    report={aiReport}
                    isLoading={aiLoading}
                    error={aiError}
                    filters={filters}
                />
                <UtilizationSection tableData={filteredVehicleTableData} filters={filters} />
            </main>
            
            <AiChat 
                currentData={filteredVehicleTableData} 
                comparisonData={comparisonVehicleTableData} 
                selectedYear={selectedYear} 
                comparisonYear={comparisonYear} 
            />
        </div>
    );
};

export default App;
