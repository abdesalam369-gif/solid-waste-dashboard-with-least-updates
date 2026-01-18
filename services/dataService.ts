
import { Trip, Vehicle, Fuel, Maintenance, Area, Population, Worker } from '../types';
import { CONFIG } from '../constants';

// Declare global Papa from script tag
declare var Papa: any;

async function fetchCSV<T>(url: string): Promise<T[]> {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
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

/**
 * Isolated worker data loader using the specific workers GID.
 * Handles cleaning of Arabic salary strings and deduplicates worker entries.
 */
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
                        
                        // Clean salary string from currency symbols, commas, etc.
                        const rawSalary = row["الراتب"];
                        let salary = Number(
                            String(rawSalary)
                                .replace(/[^\d.]/g, "")
                        );

                        if (isNaN(salary)) salary = 0;

                        if (name && role && name !== "الاسم") {
                            // Deduplication: Keep the entry with highest salary if duplicates exist
                            if (!workerMap.has(name) || salary > (workerMap.get(name)?.salary || 0)) {
                                workerMap.set(name, { name, role, area, salary });
                            }
                        }
                    });

                    const workers = Array.from(workerMap.values());
                    console.log(`Loaded ${workers.length} unique workers from GID=386592046.`);
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
    const [trips, vehicles, fuel, maint, areas, workers] = await Promise.all([
        fetchCSV<Trip>(CONFIG.trips),
        fetchCSV<Vehicle>(CONFIG.vehicles),
        fetchCSV<Fuel>(CONFIG.fuel),
        fetchCSV<Maintenance>(CONFIG.maint),
        fetchCSV<Area>(CONFIG.areas),
        loadWorkersData() 
    ]);

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
                const raw = row["عدد السكان"];
                const popValue = Number(String(raw).trim().replace(/,/g, '').replace(/\u00A0/g, '').replace(/\s/g, ''));
                return {
                    area: String(row["المنطقة"] || "").trim(),
                    population: isNaN(popValue) ? 0 : popValue
                };
            }).filter(p => p.area !== "");
        }
    } catch (error) {
        console.error("Critical error loading population data:", error);
    }

    return { trips, vehicles, fuel, maint, areas, population, workers };
}

export const formatNumber = (num: number | undefined | null, digits: number = 0): string => {
    if (num === null || num === undefined || !isFinite(num)) return "—";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};
