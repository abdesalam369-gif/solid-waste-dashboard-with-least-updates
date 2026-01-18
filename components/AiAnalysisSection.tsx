import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { printAiReport } from '../services/printService';

interface AiAnalysisSectionProps {
    vehicles: string[];
    onGenerateReport: (analysisType: string, options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string }) => void;
    report: string;
    isLoading: boolean;
    error: string;
    filters: { vehicles: Set<string>; months: Set<string> };
}

const AiAnalysisSection: React.FC<AiAnalysisSectionProps> = ({ vehicles, onGenerateReport, report, isLoading, error, filters }) => {
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
        printAiReport(
            report, 
            'تقرير تحليل الأسطول بالذكاء الاصطناعي', 
            filters
        );
    };

    return (
        <CollapsibleSection title="تحليل الأسطول بالذكاء الاصطناعي" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-bold text-md text-slate-700">خيارات التحليل</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">نوع التحليل:</label>
                        <select
                            value={analysisType}
                            onChange={(e) => setAnalysisType(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        >
                            <option value="general">تحليل عام للأسطول</option>
                            <option value="holistic_ranking">تصنيف شامل للمركبات</option>
                            <option value="detailed">تقرير مفصل لكل مركبة</option>
                            <option value="specific">تقرير لمركبة محددة</option>
                            <option value="comparison">مقارنة بين مركبات</option>
                            <option value="best_worst">تحديد أفضل وأسوأ المركبات</option>
                            <option value="custom">طلب مخصص</option>
                        </select>
                    </div>

                    {analysisType === 'specific' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">اختر مركبة:</label>
                            <select
                                value={specificVehicle}
                                onChange={(e) => setSpecificVehicle(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            >
                                {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {analysisType === 'comparison' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">اختر المركبات للمقارنة:</label>
                            <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-lg p-2 bg-white">
                                {vehicles.map(v => (
                                    <label key={v} className="flex items-center space-x-2 p-1">
                                        <input type="checkbox" checked={comparisonVehicles.includes(v)} onChange={() => handleComparisonChange(v)} />
                                        <span>{v}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {analysisType === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">اكتب طلبك:</label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                rows={4}
                                placeholder="مثال: قم بتحليل أسباب ارتفاع تكلفة الطن في المركبات القديمة..."
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            ></textarea>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateClick}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition"
                    >
                        {isLoading ? 'جاري التحليل...' : 'تشغيل التحليل'}
                    </button>
                </div>

                {/* Report Display */}
                <div className="md:col-span-2">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-md text-slate-700">التقرير</h3>
                        {report && !isLoading && (
                            <button onClick={printReport} className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600">
                                طباعة التقرير
                            </button>
                        )}
                    </div>
                    <div className="h-96 bg-slate-100 border border-slate-200 rounded-lg p-4 overflow-y-auto">
                        {isLoading && <div className="flex items-center justify-center h-full text-slate-600">يتم الآن إنشاء التقرير...</div>}
                        {error && <div className="text-red-600">{error}</div>}
                        {report && !isLoading && (
                            <div>
                                <pre className="whitespace-pre-wrap word-wrap break-words font-sans text-base leading-relaxed">{report}</pre>
                            </div>
                        )}
                         {!isLoading && !error && !report && <div className="flex items-center justify-center h-full text-slate-500">سيظهر التقرير هنا بعد تشغيل التحليل.</div>}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default AiAnalysisSection;