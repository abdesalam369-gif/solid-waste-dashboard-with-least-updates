
import React from 'react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const menuItems = [
        { id: 'kpi', label: 'المؤشرات الرئيسية', icon: '📊' },
        { id: 'charts', label: 'السلاسل الزمنية', icon: '📈' },
        { id: 'financial', label: 'الإدارة المالية', icon: '💰' },
        { id: 'intelligence', label: 'استخبارات المناطق', icon: '🧠' },
        { id: 'distribution', label: 'توزيع النفايات', icon: '📍' },
        { id: 'population', label: 'تحليل السكان', icon: '👥' },
        { id: 'salaries', label: 'كشف الأجور', icon: '💵' },
        { id: 'vehicles', label: 'كفاءة المركبات', icon: '🚛' },
        { id: 'drivers', label: 'أداء السائقين', icon: '👷' },
        { id: 'ai', label: 'تحليل الذكاء الاصطناعي', icon: '🤖' },
        { id: 'utilization', label: 'استغلال المركبات', icon: '🔄' },
    ];

    return (
        <aside 
            className={`fixed right-0 top-0 h-screen bg-white shadow-2xl z-40 transition-all duration-300 border-l border-slate-100 flex flex-col ${isOpen ? 'w-72' : 'w-20'}`}
            dir="rtl"
        >
            <div className="p-6 flex items-center justify-between border-b border-slate-50">
                {isOpen && (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">ب</div>
                        <span className="font-black text-slate-800 whitespace-nowrap">بوابة البيانات</span>
                    </div>
                )}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                >
                    {isOpen ? '◀' : '▶'}
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
                            <div className="absolute right-full mr-2 px-3 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold shadow-lg">
                                {item.label}
                            </div>
                        )}

                        {activeTab === item.id && (
                            <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"></div>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-50 text-center">
                {isOpen ? (
                    <div className="text-[10px] text-slate-400 font-bold tracking-tight">
                        بلدية مؤتة والمزار © 2025
                    </div>
                ) : (
                    <span className="text-xs">📍</span>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
