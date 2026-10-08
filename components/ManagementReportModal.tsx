import React, { useState, useRef, useEffect } from 'react';
import { 
    Trip, VehicleTableData, Fuel, Maintenance, Worker, 
    Revenue, Population, AdditionalCost, Area 
} from '../types';
import ManagementReportTemplate from './ManagementReportTemplate';
import { exportElementToPdf, printElementDirectly } from '../services/pdfExportService';
import { useLanguage } from '../contexts/LanguageContext';

export interface ManagementReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedYear: string;
    comparisonYear: string;
    filters: { vehicles: Set<string>; months: Set<string> };
    tripsData: Trip[];
    vehicleTableData: VehicleTableData[];
    fuelData: Fuel[];
    fuelLitersData: Fuel[];
    maintData: Maintenance[];
    workersData: Worker[];
    revenuesData: Revenue[];
    populationData: Population[];
    additionalCosts: AdditionalCost[];
    areasData: Area[];
    activeTab: string;
    initialScope?: 'current_view' | 'specific_chart' | 'full_executive';
    initialChart?: string;
}

export const ManagementReportModal: React.FC<ManagementReportModalProps> = ({
    isOpen,
    onClose,
    selectedYear,
    comparisonYear,
    filters,
    tripsData,
    vehicleTableData,
    fuelData,
    fuelLitersData,
    maintData,
    workersData,
    revenuesData,
    populationData,
    additionalCosts,
    areasData,
    activeTab,
    initialScope = 'full_executive',
    initialChart = 'timeseries'
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    const [scope, setScope] = useState<'current_view' | 'specific_chart' | 'full_executive'>(initialScope);
    const [selectedChart, setSelectedChart] = useState<string>(initialChart);
    const [title, setTitle] = useState<string>(t('default_report_title'));
    const [recipient, setRecipient] = useState<string>(t('default_recipient'));
    const [notes, setNotes] = useState<string>(
        isAr 
            ? `• تحسين خطوط سير الضاغطات ومتابعة استهلاك الوقود باللترات للحد من الهدر المالي.\n• مراعاة توزيع الضاغطات على أماكن عملها المحدثة وفق كثافة توليد النفايات في كل منطقة.\n• استمرار الرقابة الدورية على صيانة الآليات واسترداد رسوم الخدمة لتعزيز الاستدامة المالية.`
            : `• Optimize compactor collection routes and monitor fuel consumption in liters to minimize operational waste.\n• Ensure compactor assignments match waste density per municipal zone as updated annually.\n• Maintain proactive fleet maintenance to enhance vehicle availability and cost recovery.`
    );
    const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
    const [includeKpis, setIncludeKpis] = useState<boolean>(true);

    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [exportProgress, setExportProgress] = useState<{ status: string; percent: number }>({ status: '', percent: 0 });

    const [currentViewHtml, setCurrentViewHtml] = useState<string>('');
    const documentRef = useRef<HTMLDivElement>(null);

    // Sync initial props
    useEffect(() => {
        if (isOpen) {
            if (initialScope) setScope(initialScope);
            if (initialChart) setSelectedChart(initialChart);
            setTitle(t('default_report_title'));
            setRecipient(t('default_recipient'));

            // Capture current view HTML if scope is current_view
            const mainViewEl = document.getElementById('current-dashboard-view');
            if (mainViewEl) {
                // Clone and remove buttons/dropdowns
                const clone = mainViewEl.cloneNode(true) as HTMLElement;
                const buttons = clone.querySelectorAll('button, .no-print');
                buttons.forEach(b => b.remove());
                setCurrentViewHtml(clone.innerHTML);
            }
        }
    }, [isOpen, initialScope, initialChart, t]);

    if (!isOpen) return null;

    const handleDownloadPdf = async () => {
        const docEl = document.getElementById('management-report-document');
        if (!docEl) return;

        setIsExporting(true);
        setExportProgress({ status: t('preparing_pdf'), percent: 10 });

        try {
            const fileName = `تقرير_إدارة_بلدية_مؤتة_والمزار_${selectedYear}_${scope}`;
            await exportElementToPdf(docEl, {
                fileName,
                title,
                scale: 2,
                pageFormat: 'a4',
                orientation: 'portrait',
                onProgress: (status, percent) => {
                    setExportProgress({ status, percent });
                }
            });
        } catch (err) {
            console.error('PDF export error:', err);
            // Fallback to print
            printElementDirectly(docEl, title);
        } finally {
            setTimeout(() => {
                setIsExporting(false);
            }, 800);
        }
    };

    const handlePrintDirectly = () => {
        const docEl = document.getElementById('management-report-document');
        if (!docEl) return;
        printElementDirectly(docEl, title);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
                            📄
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">
                                {t('modal_management_report_title')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {t('modal_management_report_desc')}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body: Left/Top Controls, Right/Bottom Live Preview */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Controls Grid */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                        
                        {/* Scope Selection */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                                {t('report_scope')}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setScope('full_executive')}
                                    className={`px-4 py-3 rounded-xl text-xs md:text-sm font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                                        scope === 'full_executive'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span>🏛️</span>
                                    <span>{t('scope_full_executive')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setScope('specific_chart')}
                                    className={`px-4 py-3 rounded-xl text-xs md:text-sm font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                                        scope === 'specific_chart'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span>📊</span>
                                    <span>{t('scope_specific_chart')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setScope('current_view')}
                                    className={`px-4 py-3 rounded-xl text-xs md:text-sm font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                                        scope === 'current_view'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span>📑</span>
                                    <span>{t('scope_current_view')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Chart Selector (if specific_chart) */}
                        {scope === 'specific_chart' && (
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                                    {t('select_chart')}
                                </label>
                                <select
                                    value={selectedChart}
                                    onChange={(e) => setSelectedChart(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="timeseries">{t('chart_choice_timeseries')}</option>
                                    <option value="fuel">{t('chart_choice_fuel')}</option>
                                    <option value="workplaces">{t('chart_choice_workplaces')}</option>
                                </select>
                            </div>
                        )}

                        {/* Customization Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                                    {t('report_title_label')}
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                                    {t('recipient')}
                                </label>
                                <input
                                    type="text"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Executive Notes */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                                {t('mgmt_notes_label')}
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('mgmt_notes_placeholder')}
                                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Checkboxes */}
                        <div className="flex flex-wrap items-center gap-6 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={includeSignatures}
                                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span>{t('include_signatures')}</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={includeKpis}
                                    onChange={(e) => setIncludeKpis(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span>{t('include_kpis')}</span>
                            </label>
                        </div>
                    </div>

                    {/* Preview Label */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            👁️ {isAr ? 'معاينة المستند الإداري قبل التصدير' : 'Live Document Preview'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            A4 Portrait Layout
                        </span>
                    </div>

                    {/* Live Preview Container */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-4 max-h-[500px] overflow-y-auto">
                        <div ref={documentRef}>
                            <ManagementReportTemplate
                                title={title}
                                recipient={recipient}
                                notes={notes}
                                includeSignatures={includeSignatures}
                                includeKpis={includeKpis}
                                scope={scope}
                                selectedChart={selectedChart}
                                selectedYear={selectedYear}
                                comparisonYear={comparisonYear}
                                filters={filters}
                                tripsData={tripsData}
                                vehicleTableData={vehicleTableData}
                                fuelData={fuelData}
                                fuelLitersData={fuelLitersData}
                                maintData={maintData}
                                workersData={workersData}
                                revenuesData={revenuesData}
                                populationData={populationData}
                                additionalCosts={additionalCosts}
                                areasData={areasData}
                                activeTab={activeTab}
                                currentViewHtml={currentViewHtml}
                                isAr={isAr}
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer with Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                    <div className="text-xs font-bold text-slate-500">
                        {isAr ? 'بلدية مؤتة والمزار | وثيقة رسمية جاهزة للاعتماد' : "Mu'tah & Al-Mazar Municipality | Official Document"}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handlePrintDirectly}
                            disabled={isExporting}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs md:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <span>🖨️</span>
                            <span>{t('print_pdf_btn')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isExporting}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs md:text-sm font-black shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            <span>📥</span>
                            <span>{t('download_pdf_btn')}</span>
                        </button>
                    </div>
                </div>

                {/* Progress / Loading Overlay */}
                {isExporting && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin mb-4" />
                        <h3 className="text-lg font-black">{t('preparing_pdf')}</h3>
                        <p className="text-sm text-slate-300 mt-1">{exportProgress.status}</p>
                        <div className="w-64 bg-white/20 rounded-full h-2 mt-4 overflow-hidden">
                            <div 
                                className="bg-amber-400 h-full transition-all duration-300 rounded-full" 
                                style={{ width: `${exportProgress.percent}%` }}
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ManagementReportModal;
