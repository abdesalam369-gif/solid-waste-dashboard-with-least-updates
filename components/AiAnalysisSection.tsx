
import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { printAiReport } from '../services/printService';
/* Fix: Import useLanguage to get 't' and 'language' */
import { useLanguage } from '../contexts/LanguageContext';

interface AiAnalysisSectionProps {
    vehicles: string[];
    onGenerateReport: (analysisType: string, options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string }) => void;
    report: string;
    isLoading: boolean;
    error: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const AiAnalysisSection: React.FC<AiAnalysisSectionProps> = ({ vehicles, onGenerateReport, report, isLoading, error, filters }) => {
    /* Fix: Destructure 't' and 'language' from useLanguage */
    const { t, language } = useLanguage();
    const [analysisType, setAnalysisType] = useState('general');
    const [specificVehicle, setSpecificVehicle] = useState(vehicles[0] || '');
    const [comparisonVehicles, setComparisonVehicles] = useState<string[]>([]);
    const [customPrompt, setCustomPrompt] = useState('');

    const handleGenerateClick = () => {
        const options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string } = {};
        if (analysisType === 'specific') {
            options.vehicleId = specificVehicle;
        } else if (analysisType === 'comparison') {
            if (comparisonVehicles.length < 2) {
                alert("يرجى اختيار مركبتين على الأقل للمقارنة.");
                return;
            }
            options.vehicleIds = comparisonVehicles;
        } else if (analysisType === 'custom') {
            if (!customPrompt.trim()) {
                alert("يرجى إدخال طلب مخصص.");
                return;
            }
            options.customPrompt = customPrompt;
        }
        onGenerateReport(analysisType, options);
    };

    const handleComparisonChange = (vehicle: string) => {
        setComparisonVehicles(prev =>
            prev.includes(vehicle) ? prev.filter(v => v !== vehicle) : [...prev, vehicle]
        );
    };
    
    const printReport = () => {
        if (!report || !report.trim()) {
            alert('لا يوجد تقرير لطباعته.');
            return;
        }
        /* Fix: Pass missing 't' and 'language' arguments to printAiReport */
        printAiReport(
            report, 
            language === 'ar' ? 'تقرير تحليل الأسطول بالذكاء الاصطناعي' : 'AI Fleet Analysis Report', 
            filters,
            t,
            language
        );
    };

    return (
        <CollapsibleSection title="تحليل الأسطول بالذكاء الاصطناعي">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="md:col-span-1 space-y-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                    <h3 className="font-black text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        خيارات التحليل
                    </h3>
                    
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">نوع التحليل:</label>
                        <select
                            value={analysisType}
                            onChange={(e) => setAnalysisType(e.target.value)}
                            className="w-full p-3 border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="general">{t('ai_opt_general')}</option>
                            <option value="holistic_ranking">{t('ai_opt_holistic')}</option>
                            <option value="municipality_reality">{t('ai_opt_municipality_reality')}</option>
                            <option value="detailed">{t('ai_opt_detailed')}</option>
                            <option value="specific">{t('ai_opt_specific')}</option>
                            <option value="comparison">{t('ai_opt_comparison')}</option>
                            <option value="best_worst">{t('ai_opt_best_worst')}</option>
                            <option value="custom">{t('ai_opt_custom')}</option>
                        </select>
                    </div>

                    {analysisType === 'specific' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">اختر مركبة:</label>
                            <select
                                value={specificVehicle}
                                onChange={(e) => setSpecificVehicle(e.target.value)}
                                className="w-full p-3 border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {analysisType === 'comparison' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">اختر المركبات للمقارنة:</label>
                            <div className="max-h-40 overflow-y-auto border-2 border-indigo-50 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-2 custom-scrollbar">
                                {vehicles.map(v => (
                                    <label key={v} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" checked={comparisonVehicles.includes(v)} onChange={() => handleComparisonChange(v)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 ml-2">{v}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {analysisType === 'custom' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">اكتب طلبك:</label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                rows={4}
                                placeholder="مثال: قم بتحليل أسباب ارتفاع تكلفة الطن في المركبات القديمة..."
                                className="w-full p-3 border-2 border-indigo-50 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                            ></textarea>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateClick}
                        disabled={isLoading}
                        className="w-full px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:bg-slate-400 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                جاري التحليل...
                            </>
                        ) : 'تشغيل التحليل 🚀'}
                    </button>
                </div>

                {/* Report Display */}
                <div className="md:col-span-2 flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            التقرير
                        </h3>
                        {report && !isLoading && (
                            <button onClick={printReport} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-2">
                                🖨️ طباعة التقرير
                            </button>
                        )}
                    </div>
                    <div className="flex-1 min-h-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 overflow-y-auto shadow-sm relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-[2.5rem]">
                                <div className="w-12 h-12 border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 animate-pulse">يتم الآن إنشاء التقرير...</p>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl font-bold text-sm">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                        {report && !isLoading && (
                            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium prose-p:leading-relaxed prose-a:text-indigo-600">
                                <pre className="whitespace-pre-wrap word-wrap break-words font-sans text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">{report}</pre>
                            </div>
                        )}
                         {!isLoading && !error && !report && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-4">
                                <div className="text-6xl opacity-20">🤖</div>
                                <p className="font-bold text-sm">سيظهر التقرير هنا بعد تشغيل التحليل.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default AiAnalysisSection;
