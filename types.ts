
export interface Trip {
    'رقم المركبة': string;
    'صافي التحميل': string;
    'الشهر': string;
    'السنة': string;
    'تاريخ التوزين الثاني': string;
    'السائق'?: string;
    [key: string]: any;
}

export interface Vehicle {
    'رقم المركبة': string;
    'سنة التصنيع': string;
    'سعة المركبة بالمتر المكعب': string;
    'كثافة التحميل': string;
    [key: string]: any;
}

export interface Fuel {
    'رقم المركبة': string;
    'السنة': string;
    jan?: string;
    feb?: string;
    mar?: string;
    apr?: string;
    may?: string;
    jun?: string;
    july?: string;
    aug?: string;
    sep?: string;
    oct?: string;
    nov?: string;
    dec?: string;
    [key: string]: any;
}

export interface Maintenance {
    'رقم المركبة': string;
    'السنة': string;
    'كلفة الصيانة': string;
    [key: string]: any;
}

export interface Area {
    'رقم المركبة': string;
    'المنطقة': string;
    'السنة'?: string;
    [key: string]: any;
}

export interface Population {
    area: string;
    population: number;
    year: string;
    served: number;
}

export interface Revenue {
    year: string;
    hhFees: number;
    commercialFees: number;
    recyclingRevenue: number;
    area?: string;
}

export interface WasteTreatment {
    year: string;
    recyclablesTon: number;
    biowasteTon: number;
    otherTreatmentTon: number;
}

export interface Distance {
    'رقم المركبة': string;
    'المسافة المقطوعة (كم)': string;
    'السنة': string;
}

export interface Worker {
    name: string;
    role: string;
    area: string;
    salary: number;
}

export interface VehicleTableData {
    veh: string;
    area: string;
    drivers: string;
    year: string;
    cap_m3: number;
    cap_ton: number;
    trips: number;
    tons: number;
    fuel: number;
    maint: number;
    cost_trip: number;
    cost_ton: number;
    distance: number;
    km_per_trip: number;
}

export interface DriverStatsData {
    driver: string;
    trips: number;
    tons: number;
    avgTonsPerTrip: number;
    vehicles: string;
}

export interface AreaPopulationStats {
    area: string;
    population: number;
    served: number;
    totalTons: number;
    kgPerCapita: number;
    coverageRate: number;
}
