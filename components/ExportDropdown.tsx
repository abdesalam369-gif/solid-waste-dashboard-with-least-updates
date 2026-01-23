
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ExportDropdownProps {
    onExportPdf: () => void;
    onExportExcel?: () => void;
    onExportCsv?: () => void;
    onExportImage?: () => void;
    title?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ 
    onExportPdf, onExportExcel, onExportCsv, onExportImage, title 
}) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { id: 'pdf', label: t('export_pdf'), icon: '📄', action: onExportPdf },
        { id: 'excel', label: t('export_excel'), icon: '📊', action: onExportExcel },
        { id: 'csv', label: t('export_csv'), icon: '📝', action: onExportCsv },
        { id: 'image', label: t('export_image'), icon: '🖼️', action: onExportImage },
    ].filter(opt => opt.action !== undefined);

    return (
        <div className="relative inline-block text-right" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 border-none cursor-pointer"
            >
                <span>🚀 {t('export_as')}</span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-[100] border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 space-y-1">
                        {options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => { opt.action(); setIsOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-right"
                            >
                                <span className="text-lg">{opt.icon}</span>
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportDropdown;
