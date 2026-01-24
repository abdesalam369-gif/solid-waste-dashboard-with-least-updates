
import React, { useState, useEffect } from 'react';
import { VehicleTableData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CollapsibleSection from './CollapsibleSection';
import { getOptimalRoute, RouteInfo } from '../services/geminiService';

interface RoutePlanningSectionProps {
    vehicles: VehicleTableData[];
}

const RoutePlanningSection: React.FC<RoutePlanningSectionProps> = ({ vehicles }) => {
    const { t, language } = useLanguage();
    const [selectedVehId, setSelectedVehId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [route, setRoute] = useState<RouteInfo | null>(null);

    // Strict Area Mapping as per mandatory instructions
    const strictAreaMapping: { [key: string]: string } = {
        'مؤته': 'مؤته لواء المزار الجنوبي',
        'مؤتة': 'مؤته لواء المزار الجنوبي',
        'المزار': 'المزار لواء المزار الجنوبي',
        'الطيبة': 'الطيبة لواء المزار الجنوبي',
        'العراق': 'العراق لواء المزار الجنوبي',
        'سول': 'سول لواء المزار الجنوبي',
        'الهاشمية': 'الهاشمية لواء المزار الجنوبي',
        'جعفر': 'مجرا لواء المزار الجنوبي'
    };

    const targetLandfill = "مكب نفايات اللجون";

    const handleVehicleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedVehId(id);
        setRoute(null);

        if (!id) return;

        const vehicle = vehicles.find(v => v.veh === id);
        const areaName = vehicle?.area?.trim() || '';
        const strictStart = strictAreaMapping[areaName];

        if (strictStart) {
            setLoading(true);
            try {
                const info = await getOptimalRoute(strictStart);
                setRoute(info);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    const isRtl = language === 'ar';

    return (
        <CollapsibleSection title={t('sec_route_planning')}>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Control Panel */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                            {t('rp_select_vehicle')}
                        </label>
                        <select
                            value={selectedVehId}
                            onChange={handleVehicleChange}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                        >
                            <option value="">—</option>
                            {vehicles.map(v => (
                                <option key={v.veh} value={v.veh}>{v.veh} ({v.area})</option>
                            ))}
                        </select>
                    </div>

                    {selectedVehId && !loading && !route && !strictAreaMapping[vehicles.find(v => v.veh === selectedVehId)?.area || ''] && (
                        <div className="flex-1 text-red-500 font-bold text-sm">
                            ⚠️ {t('rp_no_area')}
                        </div>
                    )}
                </div>

                {/* Display Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                    {/* Map Visual (Iframe) */}
                    <div className="lg:col-span-2 h-[450px] rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl relative bg-slate-100 dark:bg-slate-900">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-black text-indigo-600">{t('rp_planning_in_progress')}</p>
                            </div>
                        ) : null}

                        {route ? (
                            <iframe
                                title="Optimal Route Planning"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.API_KEY}&origin=${encodeURIComponent(strictAreaMapping[vehicles.find(v => v.veh === selectedVehId)?.area || ''])}&destination=${encodeURIComponent(targetLandfill)}&mode=driving`}
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <div className="text-6xl mb-4">🛣️</div>
                                <p className="text-sm font-bold">{t('rp_select_vehicle')}</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border-r-8 border-indigo-600 h-full flex flex-col">
                            <div className="mb-8">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('rp_start_point')}</div>
                                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                                    {selectedVehId ? strictAreaMapping[vehicles.find(v => v.veh === selectedVehId)?.area || ''] || '—' : '—'}
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">نقطة الوصول الثابتة</div>
                                <div className="text-xl font-black text-emerald-600">{targetLandfill}</div>
                            </div>

                            <div className="mt-auto pt-8 border-t border-slate-50 dark:border-slate-800">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('rp_route_distance')}</div>
                                <div className="text-5xl font-black text-indigo-600 flex items-baseline gap-2">
                                    {route?.distance || '—'}
                                    <span className="text-sm font-normal text-slate-400">{t('rp_km')}</span>
                                </div>
                            </div>

                            {route?.mapLink && (
                                <a
                                    href={route.mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-8 w-full py-4 px-6 bg-slate-800 hover:bg-black text-white rounded-2xl text-xs font-black text-center transition-all active:scale-95 shadow-lg"
                                >
                                    🗺️ {t('rp_view_on_maps')}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default RoutePlanningSection;
