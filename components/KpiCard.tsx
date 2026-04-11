
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface KpiCardProps {
    value: string | number;
    label: string;
    icon: string;
    color: string;
    comparisonValue?: string | number;
    onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ value, label, icon, color, comparisonValue, onClick }) => {
    const { t } = useLanguage();

    return (
        <div 
            onClick={onClick}
            className={`kpi-card group bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-7 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(79,70,229,0.15)] dark:hover:bg-slate-800/80 hover:-translate-y-2 sm:hover:-translate-y-3 h-full relative overflow-hidden active:scale-95 hover:ring-1 hover:ring-indigo-100 dark:hover:ring-indigo-900/30 ${onClick ? 'cursor-help' : ''}`}
        >
            <div className={`absolute top-0 inset-x-0 h-1 sm:h-1.5 opacity-30 transition-opacity group-hover:opacity-100 ${color.replace('text', 'bg')}`}></div>
            
            <div className={`mb-3 sm:mb-5 p-3 sm:p-5 rounded-2xl sm:rounded-[1.8rem] transition-all duration-700 ease-out ${color.replace('text', 'bg').replace('600', '50').replace('500', '50').replace('700', '50').replace('800', '50')} dark:bg-slate-800/80 group-hover:scale-110 sm:group-hover:scale-115 group-hover:rotate-12 group-hover:shadow-lg transform shadow-inner`}>
                <span className="kpi-icon text-2xl sm:text-4xl filter drop-shadow-sm transition-transform duration-500 group-hover:scale-110">{icon}</span>
            </div>
            
            <div className={`kpi-value text-lg sm:text-3xl font-black mb-1 sm:mb-2 tracking-tighter transition-all duration-500 group-hover:scale-105 ${color}`}>
                {value}
            </div>
            
            <div className="kpi-label text-[9px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 leading-tight mb-2 sm:mb-4 uppercase tracking-[0.1em] sm:tracking-[0.15em] group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {label}
            </div>
            
            {comparisonValue !== undefined && (
                <div className="mt-auto pt-3 sm:pt-4 border-t border-slate-50 dark:border-slate-800 w-full group-hover:border-indigo-50 dark:group-hover:border-indigo-900/30 transition-colors">
                    <div className="kpi-comparison text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                        <span className="opacity-60">{t('comparison')}:</span>
                        <span className="text-slate-600 dark:text-slate-300 font-black tracking-tight">{comparisonValue}</span>
                    </div>
                </div>
            )}

            {onClick && (
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <span className="text-[8px] sm:text-[9px] bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-slate-500 font-black shadow-sm border border-slate-200 dark:border-slate-700">ℹ️</span>
                </div>
            )}
        </div>
    );
};

export default KpiCard;
