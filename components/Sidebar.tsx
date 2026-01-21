
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const { t, language } = useLanguage();
    
    const menuItems = [
        { id: 'summary', label: t('menu_summary'), icon: '📋' },
        { id: 'kpi', label: t('menu_kpi'), icon: '📊' },
        { id: 'charts', label: t('menu_charts'), icon: '📈' },
        { id: 'financial', label: t('menu_financial'), icon: '💰' },
        { id: 'intelligence', label: t('menu_intelligence'), icon: '🧠' },
        { id: 'distribution', label: t('menu_distribution'), icon: '📍' },
        { id: 'population', label: t('menu_population'), icon: '👥' },
        { id: 'salaries', label: t('menu_salaries'), icon: '💵' },
        { id: 'vehicles', label: t('menu_vehicles'), icon: '🚛' },
        { id: 'drivers', label: t('menu_drivers'), icon: '👷' },
        { id: 'ai', label: t('menu_ai'), icon: '🤖' },
        { id: 'utilization', label: t('menu_utilization'), icon: '🔄' },
    ];

    const isRtl = language === 'ar';

    return (
        <aside 
            className={`fixed ${isRtl ? 'right-0' : 'left-0'} top-0 h-screen bg-white shadow-2xl z-40 transition-all duration-300 border-${isRtl ? 'l' : 'r'} border-slate-100 flex flex-col ${isOpen ? 'w-72' : 'w-20'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <div className="p-6 flex items-center justify-between border-b border-slate-50">
                {isOpen && (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">ب</div>
                        <span className="font-black text-slate-800 whitespace-nowrap">{t('data_portal')}</span>
                    </div>
                )}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                >
                    {isOpen ? (isRtl ? '◀' : '◀') : (isRtl ? '▶' : '▶')}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group relative ${
                            activeTab === item.id 
                            ? 'bg-blue-50 text-blue-700 shadow-sm' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                    >
                        <span className="text-xl shrink-0">{item.icon}</span>
                        {isOpen && (
                            <span className="text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                {item.label}
                            </span>
                        )}
                        
                        {!isOpen && (
                            <div className={`absolute ${isRtl ? 'right-full mr-2' : 'left-full ml-2'} px-3 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold shadow-lg`}>
                                {item.label}
                            </div>
                        )}

                        {activeTab === item.id && (
                            <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} w-1 h-6 bg-blue-600 rounded-${isRtl ? 'r' : 'l'}-full`}></div>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-50 text-center">
                {isOpen ? (
                    <div className="text-[10px] text-slate-400 font-bold tracking-tight">
                        {t('footer_text')}
                    </div>
                ) : (
                    <span className="text-xs">📍</span>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
