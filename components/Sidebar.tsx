
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
        { id: 'route_planning', label: t('menu_route_planning'), icon: '🛣️' },
        { id: 'financial', label: t('menu_financial'), icon: '💰' },
        { id: 'intelligence', label: t('menu_intelligence'), icon: '🧠' },
        { id: 'population', label: t('menu_population'), icon: '👥' },
        { id: 'salaries', label: t('menu_salaries'), icon: '💵' },
        { id: 'vehicles', label: t('menu_vehicles'), icon: '🚛' },
        { id: 'drivers', label: t('menu_drivers'), icon: '👷' },
        { id: 'ai', label: t('menu_ai'), icon: '🤖' },
    ];

    const isRtl = language === 'ar';

    return (
        <aside 
            className={`fixed ${isRtl ? 'right-0' : 'left-0'} top-0 h-screen bg-white dark:bg-slate-900 shadow-2xl z-40 transition-all duration-300 border-${isRtl ? 'l' : 'r'} border-slate-100 dark:border-slate-800 flex flex-col ${isOpen ? 'w-72' : 'w-20'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <div className="p-6 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
                {isOpen && (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transition-transform hover:rotate-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7M4 7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2M4 7l8 5 8-5M12 12l8-5M12 12l-8-5m4 9h8m-8 4h4"></path>
                            </svg>
                        </div>
                        <span className="font-black text-slate-800 dark:text-slate-100 whitespace-nowrap tracking-tight">{t('data_portal')}</span>
                    </div>
                )}
                {!isOpen && (
                    <div className="flex items-center justify-center w-full">
                         <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7M4 7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2M4 7l8 5 8-5M12 12l8-5M12 12l-8-5m4 9h8m-8 4h4"></path>
                            </svg>
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors absolute top-6 right-2 md:relative md:top-auto md:right-auto"
                >
                    {isOpen ? (isRtl ? '◀' : '◀') : (isRtl ? '▶' : '▶')}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`tab-button w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group relative border-2 ${
                            activeTab === item.id 
                            ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-xl shadow-blue-600/20 border-blue-500 scale-[1.02]' 
                            : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <span className={`text-xl shrink-0 transition-transform duration-500 ${activeTab === item.id ? 'scale-110 rotate-3' : 'group-hover:rotate-6'}`}>
                            {item.icon}
                        </span>
                        {isOpen && (
                            <span className={`text-[13px] font-black whitespace-nowrap overflow-hidden text-ellipsis ${activeTab === item.id ? 'translate-x-1' : ''} transition-transform`}>
                                {item.label}
                            </span>
                        )}
                        
                        {!isOpen && (
                            <div className={`absolute ${isRtl ? 'right-full mr-4' : 'left-full ml-4'} px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap font-black shadow-2xl z-50 transform translate-x-2 group-hover:translate-x-0`}>
                                {item.label}
                            </div>
                        )}

                        {activeTab === item.id && (
                            <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]`}></div>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-50 dark:border-slate-800 text-center">
                {isOpen ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest uppercase">
                        {t('footer_text')}
                    </div>
                ) : (
                    <span className="text-xs opacity-50 animate-bounce block">📍</span>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
