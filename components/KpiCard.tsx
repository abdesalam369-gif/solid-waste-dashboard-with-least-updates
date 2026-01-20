
import React from 'react';

interface KpiCardProps {
    value: string | number;
    label: string;
    icon: string;
    color: string;
    comparisonValue?: string | number;
}

const KpiCard: React.FC<KpiCardProps> = ({ value, label, icon, color, comparisonValue }) => {
    // استخراج اللون الأساسي لمحاكاة التناسق في الحدود والخلفيات
    const getAccentClasses = (textColor: string) => {
        const colorName = textColor.split('-')[1]; // e.g., blue, green, sky
        return {
            border: `border-t-${colorName}-500`,
            iconBg: `bg-${colorName}-50`,
            iconText: textColor
        };
    };

    // ملاحظة: نستخدم كلاسات ثابتة لضمان عمل Tailwind بشكل صحيح
    const accent = getAccentClasses(color);

    return (
        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1.5 h-full relative overflow-hidden">
            {/* خط جمالي علوي ناعم */}
            <div className={`absolute top-0 inset-x-0 h-1.5 opacity-60 ${color.replace('text', 'bg')}`}></div>
            
            <div className={`mb-4 p-4 rounded-2xl transition-colors duration-300 ${color.replace('text', 'bg').replace('600', '50').replace('500', '50').replace('700', '50').replace('800', '50')} group-hover:scale-110 transform transition-transform`}>
                <span className="text-3xl filter drop-shadow-sm">{icon}</span>
            </div>
            
            <div className={`text-2xl font-black mb-1.5 tracking-tight ${color}`}>
                {value}
            </div>
            
            <div className="text-[11px] font-black text-slate-500 leading-tight mb-3 uppercase tracking-wide">
                {label}
            </div>
            
            {comparisonValue !== undefined && (
                <div className="mt-auto pt-3 border-t border-slate-50 w-full">
                    <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                        <span className="opacity-70">مقارنة:</span>
                        <span className="text-slate-600 font-black">{comparisonValue}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KpiCard;
