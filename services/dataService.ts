
import { Trip, Vehicle, Fuel, Maintenance, Area, Population, Worker, Revenue, WasteTreatment, Distance, AdditionalCost } from '../types';
import { CONFIG } from '../constants';

// Declare global Papa from script tag
declare var Papa: any;

async function fetchCSV<T>(url: string): Promise<T[]> {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Improved CSV parsing for comma handling within quotes if necessary
    // Simple split for now as per previous logic
    const header = lines.shift()!.split(",");
    
    return lines.map(line => {
        const values = line.split(",");
        const obj: { [key: string]: string } = {};
        header.forEach((h, i) => {
            obj[h.trim()] = (values[i] || "").trim();
        });
        return obj as T;
    });
}

function splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

export async function loadWorkersData(): Promise<Worker[]> {
    const url = CONFIG.workers;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        return new Promise((resolve) => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results: any) => {
                    const workerMap = new Map<string, Worker>();
                    
                    results.data.forEach((row: any) => {
                        const name = String(row["الاسم"] || "").trim();
                        const role = String(row["الوظيفة"] || "").trim();
                        const area = String(row["المنطقة"] || "").trim();
                        
                        const rawSalary = row["الراتب"];
                        let monthlySalary = Number(
                            String(rawSalary)
                                .replace(/[^\d.]/g, "")
                        );

                        if (isNaN(monthlySalary)) monthlySalary = 0;
                        const salary = monthlySalary * 12;

                        if (name && role && name !== "الاسم") {
                            if (!workerMap.has(name) || salary > (workerMap.get(name)?.salary || 0)) {
                                workerMap.set(name, { name, role, area, salary });
                            }
                        }
                    });

                    const workers = Array.from(workerMap.values());
                    resolve(workers);
                },
                error: (err: any) => {
                    console.error("PapaParse error:", err);
                    resolve([]);
                }
            });
        });
    } catch (error) {
        console.error("Failed to fetch workers data:", error);
        return [];
    }
}

export async function loadAllData() {
    const [trips, vehicles, fuel, maint, areas, workers, distance, additionalCostsRaw] = await Promise.all([
        fetchCSV<Trip>(CONFIG.trips),
        fetchCSV<Vehicle>(CONFIG.vehicles),
        fetchCSV<Fuel>(CONFIG.fuel),
        fetchCSV<Maintenance>(CONFIG.maint),
        fetchCSV<Area>(CONFIG.areas),
        loadWorkersData(),
        fetchCSV<Distance>(CONFIG.distance),
        fetchCSV<any>(CONFIG.additionalCosts)
    ]);

    // Parse Additional Costs
    const additionalCosts: AdditionalCost[] = additionalCostsRaw.map(row => {
        const parseNum = (val: any) => Number(String(val || "0").trim().replace(/,/g, '').replace(/[^\d.-]/g, ''));
        return {
            insurance: parseNum(row["تكاليف التأمين والترخيص"]),
            clothing: parseNum(row["ملابس عمال"]),
            cleaning: parseNum(row["لوازم نظافة"]),
            containers: parseNum(row["شراء حاويات"]),
            year: String(row["السنة"] || "").trim()
        };
    }).filter(c => c.year !== "");

    let population: Population[] = [];
    try {
        const popResponse = await fetch(CONFIG.population);
        const popText = await popResponse.text();
        const popLines = popText.trim().split(/\r?\n/);

        if (popLines.length >= 2) {
            const popHeader = splitCsvLine(popLines.shift()!).map(h => h.replace(/^"|"$/g, '').trim());
            const populationRows = popLines.map(line => {
                const values = splitCsvLine(line);
                const obj: any = {};
                popHeader.forEach((h, i) => {
                    obj[h] = (values[i] || "").replace(/^"|"$/g, '').trim();
                });
                return obj;
            });

            population = populationRows.map(row => {
                const popRaw = row["عدد السكان"];
                const servedRaw = row["التغطية"]; 
                
                const parseNum = (val: any) => Number(String(val).trim().replace(/,/g, '').replace(/\u00A0/g, '').replace(/\s/g, ''));
                
                return {
                    area: String(row["المنطقة"] || "").trim(),
                    population: parseNum(popRaw) || 0,
                    year: String(row["السنة"] || "").trim(),
                    served: parseNum(servedRaw) || 0
                };
            }).filter(p => p.area !== "");
        }
    } catch (error) {
        console.error("Critical error loading population data:", error);
    }

    let revenues: Revenue[] = [];
    try {
        const revResponse = await fetch(CONFIG.revenues);
        const revText = await revResponse.text();
        const revLines = revText.trim().split(/\r?\n/);
        
        if (revLines.length >= 2) {
            const revHeader = splitCsvLine(revLines.shift()!).map(h => h.replace(/^"|"$/g, '').trim());
            const revRows = revLines.map(line => {
                const values = splitCsvLine(line);
                const obj: any = {};
                revHeader.forEach((h, i) => {
                    obj[h] = (values[i] || "").replace(/^"|"$/g, '').trim();
                });
                return obj;
            });

            revenues = revRows.map(row => {
                const parseNum = (val: any) => {
                    const cleanVal = String(val || "").trim().replace(/,/g, '').replace(/[^\d.-]/g, '');
                    const num = Number(cleanVal);
                    return isNaN(num) || cleanVal === "" ? 0 : num;
                };
                
                return {
                    year: String(row["year"] || "").trim(),
                    hhFees: parseNum(row["HH Fees"]),
                    commercialFees: parseNum(row["Commercial fees"] || row["Commercial Fees"]),
                    recyclingRevenue: parseNum(row["Recycling Revenue"]),
                    area: row["المنطقة"] ? String(row["المنطقة"]).trim() : undefined
                };
            }).filter(r => r.year !== "");
        }
    } catch (error) {
        console.error("Error loading revenue data:", error);
    }

    let treatment: WasteTreatment[] = [];
    try {
        const treatResponse = await fetch(CONFIG.treatment);
        const treatText = await treatResponse.text();
        const treatLines = treatText.trim().split(/\r?\n/);
        
        if (treatLines.length >= 2) {
            const treatHeader = splitCsvLine(treatLines.shift()!).map(h => h.replace(/^"|"$/g, '').trim());
            const treatRows = treatLines.map(line => {
                const values = splitCsvLine(line);
                const obj: any = {};
                treatHeader.forEach((h, i) => {
                    obj[h] = (values[i] || "").replace(/^"|"$/g, '').trim();
                });
                return obj;
            });

            treatment = treatRows.map(row => {
                const parseNum = (val: any) => Number(String(val || "0").trim().replace(/,/g, '').replace(/[^\d.-]/g, ''));
                return {
                    year: String(row["year"] || "").trim(),
                    recyclablesTon: parseNum(row["Recyclables ton"]),
                    biowasteTon: parseNum(row["Biowaste ton"]),
                    otherTreatmentTon: parseNum(row["Other Treatment ton"])
                };
            }).filter(t => t.year !== "");
        }
    } catch (error) {
        console.error("Error loading treatment data:", error);
    }

    return { trips, vehicles, fuel, maint, areas, population, workers, revenues, treatment, distance, additionalCosts };
}

export const formatNumber = (num: number | undefined | null, digits: number = 0): string => {
    if (num === null || num === undefined || !isFinite(num)) return "—";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};
