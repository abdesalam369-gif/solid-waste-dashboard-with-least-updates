
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface KpiExplanationModalProps {
    isOpen: boolean;
    onClose: () => void;
    label: string;
}

const KpiExplanationModal: React.FC<KpiExplanationModalProps> = ({ isOpen, onClose, label }) => {
    const { t, language } = useLanguage();

    if (!isOpen) return null;

    // Mapping label (current language) to explanation key
    const getExplanation = (lbl: string) => {
        const lowerLabel = lbl.toLowerCase();
        
        // 1. Waste Quantities
        if (lowerLabel.includes('إجمالي النفايات') || lowerLabel.includes('total transported waste') || lowerLabel.includes('total waste') || lowerLabel.includes('total tons')) {
            return t('exp_total_waste') as any;
        }
        if (lowerLabel.includes('معدل الإنتاج اليومي') || lowerLabel.includes('daily collection rate') || lowerLabel.includes('daily waste rate')) {
            return t('exp_daily_waste_rate') as any;
        }
        if (lowerLabel.includes('إجمالي الرحلات') || lowerLabel.includes('total trips')) {
            return t('exp_total_trips') as any;
        }
        
        // 2. Per Capita Generation
        if (lowerLabel.includes('تولد النفايات للفرد') || lowerLabel.includes('gen/capita') || lowerLabel.includes('waste/capita')) {
            if (lowerLabel.includes('nswms')) return t('exp_waste_nswms') as any;
            return t('exp_waste_capita') as any;
        }
        
        // 3. Costs
        if (lowerLabel.includes('كلفة الطن') || lowerLabel.includes('unit cost / ton') || lowerLabel.includes('cost per ton')) {
            return t('exp_cost_ton') as any;
        }
        if (lowerLabel.includes('إجمالي كلفة') || lowerLabel.includes('total management cost') || lowerLabel.includes('total annual expenses') || lowerLabel.includes('total annual costs')) {
            return t('exp_total_cost') as any;
        }
        if (lowerLabel.includes('كلفة الفرد') || lowerLabel.includes('cost per capita') || lowerLabel.includes('annual cost / capita')) {
            return t('exp_cost_capita') as any;
        }
        if (lowerLabel.includes('كلفة الرحلة') || lowerLabel.includes('unit cost / trip') || lowerLabel.includes('cost per trip')) {
            return t('exp_cost_per_trip') as any;
        }
        if (lowerLabel.includes('وقود') || lowerLabel.includes('fuel')) {
            return t('exp_fuel_cost') as any;
        }
        if (lowerLabel.includes('صيانة') || lowerLabel.includes('maint')) {
            return t('exp_maint_cost') as any;
        }
        
        // 4. Financials & Recovery
        if (lowerLabel.includes('استرداد التكاليف') || lowerLabel.includes('cost recovery')) {
            return t('exp_cost_recovery') as any;
        }
        if (lowerLabel.includes('القدرة على التحمل') || lowerLabel.includes('affordability')) {
            return t('exp_affordability') as any;
        }
        if (lowerLabel.includes('إجمالي الإيرادات') || lowerLabel.includes('total revenue')) {
            return t('exp_total_revenue') as any;
        }
        if (lowerLabel.includes('إيرادات المنازل') || lowerLabel.includes('residential fees') || lowerLabel.includes('hh revenue')) {
            return t('exp_hh_revenue') as any;
        }
        if (lowerLabel.includes('إيرادات التجاري') || lowerLabel.includes('commercial fees') || lowerLabel.includes('commercial revenue')) {
            return t('exp_commercial_revenue') as any;
        }
        
        // 5. Coverage & Population
        if (lowerLabel.includes('إجمالي السكان') || lowerLabel.includes('total population')) {
            return t('exp_total_pop') as any;
        }
        if (lowerLabel.includes('المخدومون') || lowerLabel.includes('served population')) {
            return t('exp_served_pop') as any;
        }
        if (lowerLabel.includes('تغطية') || lowerLabel.includes('coverage')) {
            return t('exp_coverage_rate') as any;
        }
        if (lowerLabel.includes('عامل وطن') || lowerLabel.includes('citizens per worker') || lowerLabel.includes('pop per cleaner')) {
            return t('exp_pop_per_cleaner') as any;
        }
        if (lowerLabel.includes('مناطق') || lowerLabel.includes('areas covered')) {
            return t('exp_areas_served') as any;
        }
        if (lowerLabel.includes('عاملين') || lowerLabel.includes('staff force') || lowerLabel.includes('workers count')) {
            return t('exp_workers_count') as any;
        }
        
        // 6. Treatment & Recycling
        if (lowerLabel.includes('تدوير') || lowerLabel.includes('recycling')) {
            return t('exp_recycling_rate') as any;
        }
        if (lowerLabel.includes('تحويل') || lowerLabel.includes('diversion')) {
            return t('exp_diversion_rate') as any;
        }
        if (lowerLabel.includes('معالج') || lowerLabel.includes('processed') || lowerLabel.includes('treated')) {
            return t('exp_total_treated') as any;
        }

        // 7. Fleet
        if (lowerLabel.includes('المركبات النشطة') || lowerLabel.includes('active fleet') || lowerLabel.includes('active vehicles')) {
            return t('exp_active_vehicles') as any;
        }
        if (lowerLabel.includes('أيام تشغيلية') || lowerLabel.includes('operational days') || lowerLabel.includes('op days')) {
            return t('exp_op_days') as any;
        }
        if (lowerLabel.includes('حمولة الرحلة') || lowerLabel.includes('load per trip') || lowerLabel.includes('avg load')) {
            return t('exp_avg_load') as any;
        }
        if (lowerLabel.includes('سعة') || lowerLabel.includes('capacity')) {
            return t('exp_avg_capacity') as any;
        }

        // Fallback for titles that might be slightly different
        return null;
    };

    const exp = getExplanation(label);
    const isRtl = language === 'ar';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{label}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className={`p-8 space-y-6 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {exp ? (
                        <>
                            <section>
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">{t('kpi_exp_represents')}</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm font-bold leading-relaxed">{exp.rep}</p>
                            </section>
                            
                            <div className="h-px bg-slate-50 dark:bg-slate-800"></div>

                            <section>
                                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">{t('kpi_exp_based_on')}</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed">{exp.basis}</p>
                            </section>

                            <div className="h-px bg-slate-50 dark:bg-slate-800"></div>

                            <section>
                                <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">{t('kpi_exp_understanding')}</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed italic">{exp.und}</p>
                            </section>
                        </>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            {isRtl ? 'بيانات الشرح غير متوفرة حالياً للمؤشر المختار' : 'Detailed explanation currently unavailable for selected indicator'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end border-t border-slate-100 dark:border-slate-700">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black hover:bg-slate-900 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95"
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KpiExplanationModal;
