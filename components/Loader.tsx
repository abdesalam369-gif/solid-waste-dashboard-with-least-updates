
import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999]">
            <div className="relative flex items-center justify-center">
                {/* الحلقة الخارجية الكبيرة */}
                <div className="w-24 h-24 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                
                {/* الحلقة المتحركة الأولى - أزرق */}
                <div 
                    className="absolute w-24 h-24 border-4 border-transparent border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"
                    style={{ animationDuration: '1.2s' }}
                ></div>
                
                {/* الحلقة المتحركة الثانية - سماوي (عكس الاتجاه) */}
                <div 
                    className="absolute w-16 h-16 border-4 border-transparent border-b-cyan-500 dark:border-b-cyan-400 rounded-full animate-spin"
                    style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}
                ></div>
                
                {/* النقطة المركزية النابضة */}
                <div className="absolute w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(79,70,229,0.6)]"></div>
            </div>
            
            <div className="mt-8 flex flex-col items-center">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-wide animate-pulse">
                    جاري التحميل...
                </p>
                <div className="mt-2 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
            </div>
            
            <p className="absolute bottom-10 text-slate-400 dark:text-slate-500 text-sm font-medium">
                بلدية مؤتة والمزار | لوحة التحكم الذكية
            </p>
        </div>
    );
};

export default Loader;
