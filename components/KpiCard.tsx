
import React from 'react';

interface KpiCardProps {
    value: string | number;
    label: string;
    icon: string;
    color: string;
    comparisonValue?: string | number;
}

const KpiCard: React.FC<KpiCardProps> = ({ value, label, icon, color, comparisonValue }) => {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-lg transition-transform hover:-translate-y-1 relative overflow-hidden">
            <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
            {comparisonValue !== undefined && (
                <div className="text-xs text-slate-400 font-semibold mb-2">
                    مقابل {comparisonValue} في سنة المقارنة
                </div>
            )}
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                {label}
            </div>
        </div>
    );
};

export default KpiCard;
