
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
            className={`kpi-card group bg-white dark:bg-slate-900 rounded-[2.5rem] p-7 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:bg-slate-800/80 hover:-translate-y-3 h-full relative overflow-hidden ${onClick ? 'cursor-help' : ''}`}
        >
            <div className={`absolute top-0 inset-x-0 h-2 opacity-40 transition-opacity group-hover:opacity-100 ${color.replace('text', 'bg')}`}></div>
            
            <div className={`mb-5 p-5 rounded-[1.5rem] transition-all duration-500 ${color.replace('text', 'bg').replace('600', '50').replace('500', '50').replace('700', '50').replace('800', '50')} dark:bg-slate-800 group-hover:scale-125 group-hover:rotate-6 transform shadow-inner`}>
                <span className="text-4xl filter drop-shadow-sm transition-transform">{icon}</span>
            </div>
            
            <div className={`text-3xl font-black mb-2 tracking-tighter transition-colors duration-300 ${color}`}>
                {value}
            </div>
            
            <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 leading-tight mb-4 uppercase tracking-[0.1em] group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {label}
            </div>
            
            {comparisonValue !== undefined && (
                <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 w-full group-hover:border-slate-100 dark:group-hover:border-slate-700 transition-colors">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center justify-center gap-1">
                        <span className="opacity-70">{t('comparison')}:</span>
                        <span className="text-slate-600 dark:text-slate-300 font-black">{comparisonValue}</span>
                    </div>
                </div>
            )}

            {onClick && (
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-black shadow-sm">INFO ℹ️</span>
                </div>
            )}
        </div>
    );
};

export default KpiCard;
