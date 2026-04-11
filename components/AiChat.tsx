
import React, { useState, useRef, useEffect } from 'react';
import { chatWithDataStream } from '../services/geminiService';
import { VehicleTableData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AiChatProps {
    currentData: VehicleTableData[];
    comparisonData: VehicleTableData[];
    selectedYear: string;
    comparisonYear: string;
}

const AiChat: React.FC<AiChatProps> = ({ currentData, comparisonData, selectedYear, comparisonYear }) => {
    const { t, language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (customInput?: string) => {
        const textToSend = customInput || input;
        if (!textToSend.trim() || isTyping) return;

        const userMessage = textToSend.trim();
        if (!customInput) setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        try {
            let aiResponse = '';
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);
            
            const stream = chatWithDataStream(
                userMessage,
                currentData,
                comparisonData,
                { selected: selectedYear, comparison: comparisonYear },
                language
            );

            for await (const chunk of stream) {
                aiResponse += chunk;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = aiResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'ai', content: language === 'ar' ? 'عذراً، حدث خطأ أثناء الاتصال بالمحرك السريع.' : 'Sorry, an error occurred while connecting to the engine.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className={`fixed bottom-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-50 flex flex-col items-end`}>
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[calc(100vw-3rem)] sm:w-96 h-[500px] sm:h-[550px] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-5 animate-in slide-in-from-bottom-10 duration-500 ease-out">
                    <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 dark:from-indigo-900 dark:via-blue-900 dark:to-sky-800 p-5 text-white flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm animate-pulse">
                                <span className="text-xl">⚡</span>
                            </div>
                            <div>
                                <span className="font-bold block text-sm">{t('ai_agent_name')}</span>
                                <span className="text-[10px] text-blue-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                                    {t('ai_agent_connected')}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-2 transition-all active:scale-90">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
                        {messages.length === 0 && (
                            <div className="text-center mt-12 px-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <h4 className="text-slate-800 dark:text-slate-200 font-bold mb-2">{t('ai_how_can_help')}</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">{t('ai_chat_hint')}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => handleSend(t('ai_suggest_1'))} className={`text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition-all ${language === 'ar' ? 'text-right' : 'text-left'} shadow-sm`}>⚡ {t('ai_suggest_1')}</button>
                                    <button onClick={() => handleSend(t('ai_suggest_2'))} className={`text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition-all ${language === 'ar' ? 'text-right' : 'text-left'} shadow-sm`}>⛽ {t('ai_suggest_2')}</button>
                                    <button onClick={() => handleSend(t('ai_suggest_3'))} className={`text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition-all ${language === 'ar' ? 'text-right' : 'text-left'} shadow-sm`}>📊 {t('ai_suggest_3')}</button>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? (language === 'ar' ? 'justify-start' : 'justify-end') : (language === 'ar' ? 'justify-end' : 'justify-start')}`}>
                                <div className={`max-w-[88%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-bl-none'}`}>
                                    {msg.content || (isTyping && idx === messages.length - 1 ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : '')}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={language === 'ar' ? 'اسألني عن أي شيء...' : 'Ask me anything...'}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isTyping || !input.trim()}
                            className="bg-indigo-600 dark:bg-indigo-700 text-white p-3 rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-all active:scale-90 shadow-lg shadow-indigo-100 dark:shadow-none"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-500 ${isOpen ? 'bg-slate-800 dark:bg-slate-700 text-white rotate-180' : 'bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-700 dark:to-blue-800 text-white hover:shadow-indigo-200 dark:hover:shadow-indigo-900/50'}`}
            >
                {isOpen ? (
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                ) : (
                    <div className="relative">
                        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AiChat;
