'use client';

import { useEffect, useState } from 'react';
import { Loader2, Activity, Calendar as CalendarIcon, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek 
} from 'date-fns';

interface DailyAssignment {
    date: string;
    count: number;
}

interface AnalyticsData {
    total_assigned: number;
    daily_assignments: DailyAssignment[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for the calendar
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchAnalytics(currentDate);
    }, [currentDate]);

    const fetchAnalytics = async (date: Date) => {
        setIsLoading(true);
        try {
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const res = await api.get(`/admin/qr/dynamic/analytics?month=${month}&year=${year}`);
            setData(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Calendar logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const maxCount = Math.max(1, ...(data?.daily_assignments.map((d) => d.count) || []));

    const getCountForDay = (dateObj: Date) => {
        const formattedDate = format(dateObj, 'yyyy-MM-dd');
        const found = data?.daily_assignments.find((d) => d.date === formattedDate);
        return found ? found.count : 0;
    };

    // Calculate intensity color class based on count
    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-[#1a2133] border-white/5 text-slate-500';
        const ratio = count / maxCount;
        if (ratio <= 0.25) return 'bg-indigo-900/40 border-indigo-500/20 text-indigo-200';
        if (ratio <= 0.5) return 'bg-indigo-800/60 border-indigo-500/40 text-indigo-100';
        if (ratio <= 0.75) return 'bg-indigo-600/80 border-indigo-500/60 text-white';
        return 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-indigo-400" />
                        Analytics Overview
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your QR code assignment activity over time.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Assigned Stat Card */}
                <div className="bg-[#161b27] border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <QrCode className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Total Assigned</p>
                            <h3 className="text-3xl font-bold text-white">
                                {isLoading && !data ? <Loader2 className="animate-spin text-slate-500 mt-1" size={20} /> : (data?.total_assigned || 0)}
                            </h3>
                        </div>
                    </div>
                    <div className="text-xs text-indigo-400/80 font-medium">
                        All time total assignments
                    </div>
                </div>
            </div>

            {/* Calendar View */}
            <div className="bg-[#161b27] border border-white/5 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <CalendarIcon size={20} className="text-slate-400" />
                        Assignment Calendar
                    </h2>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={prevMonth}
                            className="p-2 bg-[#0a0d16] hover:bg-[#1f2638] border border-white/10 rounded-lg text-slate-300 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-white font-medium min-w-[140px] text-center">
                            {format(currentDate, 'MMMM yyyy')}
                        </div>
                        <button 
                            onClick={nextMonth}
                            className="p-2 bg-[#0a0d16] hover:bg-[#1f2638] border border-white/10 rounded-lg text-slate-300 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="text-red-400 text-center p-8">{error}</div>
                ) : (
                    <div className="relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-[#161b27]/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                                <Loader2 className="animate-spin text-indigo-500" size={32} />
                            </div>
                        )}
                        
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((day, idx) => {
                                const count = getCountForDay(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className={`
                                            relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-300 group
                                            ${!isCurrentMonth ? 'opacity-20' : 'hover:scale-105 hover:z-20'}
                                            ${getIntensityClass(count)}
                                        `}
                                    >
                                        <span className={`text-sm md:text-base font-semibold ${isToday && count === 0 ? 'text-indigo-400' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {count > 0 && (
                                            <span className="text-[10px] md:text-xs opacity-90 mt-0.5">
                                                {count} {count === 1 ? 'QR' : 'QRs'}
                                            </span>
                                        )}
                                        {isToday && (
                                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full ring-2 ring-[#161b27]"></div>
                                        )}
                                        
                                        {/* Tooltip */}
                                        {count > 0 && (
                                            <div className="absolute -top-12 bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 shadow-xl border border-white/10">
                                                <div className="font-semibold text-indigo-300">{count} assigned</div>
                                                <div className="text-slate-400 text-[10px] mt-0.5">{format(day, 'MMMM d, yyyy')}</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Heatmap Legend */}
                <div className="mt-8 flex items-center justify-end gap-3 text-xs text-slate-400 font-medium">
                    <span>Less Activity</span>
                    <div className="flex gap-1">
                        <div className="w-5 h-5 rounded-sm bg-[#1a2133] border border-white/5"></div>
                        <div className="w-5 h-5 rounded-sm bg-indigo-900/40 border border-indigo-500/20"></div>
                        <div className="w-5 h-5 rounded-sm bg-indigo-800/60 border border-indigo-500/40"></div>
                        <div className="w-5 h-5 rounded-sm bg-indigo-600/80 border border-indigo-500/60"></div>
                        <div className="w-5 h-5 rounded-sm bg-indigo-500 border border-indigo-400"></div>
                    </div>
                    <span>High Activity</span>
                </div>
            </div>
        </div>
    );
}
