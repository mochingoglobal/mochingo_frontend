'use client';

import { useEffect, useState, useMemo } from 'react';
import { Languages, Search, Check, ChevronDown } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic (العربية)' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'bho', name: 'Bhojpuri (भोजपुरी)' },
    { code: 'my', name: 'Burmese (မြန်မာ)' },
    { code: 'zh-CN', name: 'Chinese Simplified (简体中文)' },
    { code: 'zh-TW', name: 'Chinese Traditional (繁體中文)' },
    { code: 'nl', name: 'Dutch (Nederlands)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'el', name: 'Greek (Ελληνικά)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'hi', name: 'Hindi (हिंदी)' },
    { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'ms', name: 'Malay (Bahasa Melayu)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'fa', name: 'Persian (فارسی)' },
    { code: 'pl', name: 'Polish (Polski)' },
    { code: 'pt', name: 'Portuguese (Português)' },
    { code: 'ru', name: 'Russian (Русский)' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'sw', name: 'Swahili (Kiswahili)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'th', name: 'Thai (ไทย)' },
    { code: 'tr', name: 'Turkish (Türkçe)' },
    { code: 'uk', name: 'Ukrainian (Українська)' },
    { code: 'ur', name: 'Urdu (اردو)' },
    { code: 'vi', name: 'Vietnamese (Tiếng Việt)' }
].sort((a, b) => a.name.localeCompare(b.name));

export default function GoogleTranslateWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentLang, setCurrentLang] = useState('en');

    useEffect(() => {
        // Initialize Google Translate script
        (window as any).googleTranslateElementInit = () => {
            if ((window as any).google && (window as any).google.translate) {
                new (window as any).google.translate.TranslateElement(
                    { pageLanguage: 'en', autoDisplay: false },
                    'google_translate_element'
                );
            }
        };

        if (!document.getElementById('google-translate-script')) {
            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        } else {
            if ((window as any).google && (window as any).google.translate) {
                const el = document.getElementById('google_translate_element');
                if (el && el.innerHTML === '') {
                    (window as any).googleTranslateElementInit();
                }
            }
        }

        // Set initial language based on Google's cookie
        const cookieLang = document.cookie.split('; ').find(row => row.startsWith('googtrans='))?.split('=')[1];
        if (cookieLang) {
            const code = cookieLang.split('/')[2] || cookieLang.split('/')[1] || 'en';
            setCurrentLang(code);
        }
    }, []);

    const handleSelect = (code: string) => {
        setCurrentLang(code);
        setIsOpen(false);
        setSearch('');

        // Force set Google Translate cookies for reliability across all pages
        document.cookie = `googtrans=/en/${code}; path=/; max-age=31536000`;
        document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname}; max-age=31536000`;

        // Attempt to trigger it programmatically if the script loaded properly
        const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectEl) {
            selectEl.value = code;
            selectEl.dispatchEvent(new Event('change'));
        } else {
            // If the script is blocked or hasn't loaded yet, the cookie is set, so just reload
            window.location.reload();
        }
    };

    const filteredLanguages = useMemo(() => {
        return SUPPORTED_LANGUAGES.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    }, [search]);

    const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name.split(' ')[0] || 'Translate';

    return (
        <>
            {/* Hidden container for the native Google Translate injection */}
            <div id="google_translate_element" className="fixed -top-[9999px] -left-[9999px] w-10 h-10 overflow-hidden opacity-0 pointer-events-none z-[-1]"></div>

            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999]">
                {/* Custom Trigger Button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-sm px-3.5 py-2 transition-all hover:bg-white hover:shadow-md h-[40px] cursor-pointer"
                >
                    <Languages size={16} className="text-indigo-600 shrink-0" />
                    <span className="text-[13px] font-bold text-slate-700 truncate max-w-[90px]">
                        {currentLangName}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {/* Custom Searchable Dropdown Modal */}
                {isOpen && (
                    <div className="absolute top-[48px] right-0 w-[240px] bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        
                        {/* Search Bar */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search language..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full h-9 pl-8 pr-3 text-[13px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Language Options */}
                        <div className="max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar bg-white">
                            {filteredLanguages.length > 0 ? (
                                filteredLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleSelect(lang.code)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                            currentLang === lang.code 
                                                ? 'bg-indigo-50 text-indigo-700' 
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{lang.name}</span>
                                        {currentLang === lang.code && <Check size={14} className="text-indigo-600 shrink-0" />}
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                    No language found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .goog-te-banner-frame.skiptranslate { display: none !important; }
                body { top: 0px !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; }
            ` }} />
        </>
    );
}
