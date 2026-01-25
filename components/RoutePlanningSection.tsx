
import React, { useState, useEffect } from 'react';
import { VehicleTableData, RouteInfo, RouteOption } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CollapsibleSection from './CollapsibleSection';
import { getOptimalRoute } from '../services/geminiService';

interface RoutePlanningSectionProps {
    vehicles: VehicleTableData[];
}

const RoutePlanningSection: React.FC<RoutePlanningSectionProps> = ({ vehicles }) => {
    const { t, language } = useLanguage();
    const [selectedVehId, setSelectedVehId] = useState<string>('');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [routeData, setRouteData] = useState<RouteInfo | null>(null);
    const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);

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

    const handleCalculate = async () => {
        let start = '';
        let end = '';

        if (isCustomMode) {
            if (!customStart.trim() || !customEnd.trim()) {
                alert(language === 'ar' ? "يرجى إدخال نقطة الانطلاق والوصول." : "Please enter both start and end points.");
                return;
            }
            start = customStart;
            end = customEnd;
        } else {
            if (!selectedVehId) return;
            const vehicle = vehicles.find(v => v.veh === selectedVehId);
            const areaName = vehicle?.area?.trim() || '';
            start = strictAreaMapping[areaName] || areaName;
            end = targetLandfill;
            if (!start) {
                alert(language === 'ar' ? "نقطة انطلاق المنطقة غير معروفة." : "Area starting point is unknown.");
                return;
            }
        }

        setLoading(true);
        setRouteData(null);
        setActiveRouteIndex(0);
        try {
            const result = await getOptimalRoute(start, end);
            setRouteData(result);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedVehId(e.target.value);
        setIsCustomMode(false);
        setRouteData(null);
    };

    const activeRoute = routeData?.routes[activeRouteIndex];
    const isRtl = language === 'ar';

    return (
        <CollapsibleSection title={t('sec_route_planning')}>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Control Panel */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Preset Selection */}
                        <div className={`flex-1 w-full space-y-4 ${isCustomMode ? 'opacity-40 grayscale' : ''} transition-all`}>
                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">توجيه حسب منطقة الضاغطة</h5>
                            <select
                                value={selectedVehId}
                                onChange={handleVehicleChange}
                                disabled={isCustomMode}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                            >
                                <option value="">— اختر الضاغطة —</option>
                                {vehicles.map(v => (
                                    <option key={v.veh} value={v.veh}>{v.veh} ({v.area})</option>
                                ))}
                            </select>
                        </div>

                        {/* Divider or Switch */}
                        <div className="flex flex-col items-center justify-center gap-2">
                             <button 
                                onClick={() => setIsCustomMode(!isCustomMode)}
                                className={`p-3 rounded-full transition-all ${isCustomMode ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                             >
                                🔄
                             </button>
                             <span className="text-[9px] font-black text-slate-400 uppercase">تبديل الوضع</span>
                        </div>

                        {/* Custom Inputs */}
                        <div className={`flex-[1.5] w-full space-y-4 ${!isCustomMode ? 'opacity-40 grayscale' : ''} transition-all`}>
                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">تخطيط مسار مخصص (أي نقطتين)</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                    type="text"
                                    placeholder="نقطة الانطلاق (مثال: الكرك، مؤتة...)"
                                    value={customStart}
                                    onChange={(e) => { setCustomStart(e.target.value); setIsCustomMode(true); }}
                                    className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                                />
                                <input 
                                    type="text"
                                    placeholder="نقطة الوصول (مثال: مكب اللجون، المزار...)"
                                    value={customEnd}
                                    onChange={(e) => { setCustomEnd(e.target.value); setIsCustomMode(true); }}
                                    className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button 
                            onClick={handleCalculate}
                            disabled={loading || (!isCustomMode && !selectedVehId)}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none"
                        >
                            {loading ? t('rp_planning_in_progress') : 'تخطيط المسارات المقترحة 🔎'}
                        </button>
                    </div>
                </div>

                {/* Display Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Map Visual (Iframe) */}
                    <div className="lg:col-span-2 h-[550px] rounded-[3rem] overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl relative bg-slate-100 dark:bg-slate-900 transition-all">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-md z-20">
                                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                                <p className="text-lg font-black text-indigo-700 dark:text-indigo-400 animate-pulse">{t('rp_planning_in_progress')}</p>
                            </div>
                        )}

                        {routeData ? (
                            <iframe
                                key={activeRouteIndex}
                                title="Optimal Route Planning"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.API_KEY}&origin=${encodeURIComponent(isCustomMode ? customStart : (strictAreaMapping[vehicles.find(v => v.veh === selectedVehId)?.area || ''] || ''))}&destination=${encodeURIComponent(isCustomMode ? customEnd : targetLandfill)}&mode=driving`}
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-4">
                                <div className="text-8xl opacity-20">🚚💨</div>
                                <p className="text-lg font-black">{t('rp_select_vehicle')}</p>
                                <p className="text-xs font-bold text-slate-400 max-w-xs">سيقوم المساعد الذكي بتحليل الطرق المتاحة واقتراح أفضل 3 مسارات تشغيلية لرحلات الجمع والنقل.</p>
                            </div>
                        )}
                    </div>

                    {/* Side Info & Route Selector */}
                    <div className="lg:col-span-1 space-y-6">
                        {routeData ? (
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                    المسارات المقترحة ({routeData.routes.length})
                                </h4>
                                <div className="space-y-3">
                                    {routeData.routes.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveRouteIndex(idx)}
                                            className={`w-full text-right p-5 rounded-3xl border-2 transition-all group ${
                                                activeRouteIndex === idx 
                                                ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/20 text-white' 
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-900'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${activeRouteIndex === idx ? 'text-indigo-200' : 'text-slate-400'}`}>مسار مقترح #{idx+1}</span>
                                                {activeRouteIndex === idx && <span className="text-xs">✅</span>}
                                            </div>
                                            <div className="text-lg font-black mb-2">{opt.name}</div>
                                            <div className="flex items-center gap-4 text-xs font-bold opacity-80">
                                                <span>📏 {opt.distance}</span>
                                                <span>⏱️ {opt.duration}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {routeData.summary && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-bold">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🤖</span>
                                            <span className="uppercase tracking-widest text-[9px]">نصيحة الذكاء الاصطناعي:</span>
                                        </div>
                                        {routeData.summary}
                                    </div>
                                )}

                                {activeRoute?.mapLink && (
                                    <a
                                        href={activeRoute.mapLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-4 bg-slate-800 hover:bg-black text-white rounded-2xl text-xs font-black text-center transition-all shadow-lg active:scale-95"
                                    >
                                        🗺️ فتح المسار التفصيلي في الخرائط
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border-r-8 border-slate-200 h-full flex flex-col items-center justify-center text-center">
                                <div className="text-5xl mb-4 grayscale opacity-30">📍</div>
                                <h4 className="text-sm font-black text-slate-400 mb-2">بيانات المسار</h4>
                                <p className="text-[10px] font-bold text-slate-300">اختر نقطة انطلاق لبدء التحليل الجغرافي للمسارات.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default RoutePlanningSection;
