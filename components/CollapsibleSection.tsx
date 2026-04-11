
import React, { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 mb-8 transition-colors">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-right font-black text-xl text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-5 rounded-[2rem] transition-all duration-300"
            >
                {title}
                <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'} bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </button>
            {isOpen && (
                <div className="pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
