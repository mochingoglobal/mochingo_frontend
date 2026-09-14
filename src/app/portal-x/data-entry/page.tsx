'use client';

import { useEffect, useState, useRef } from 'react';
import { Database, Plus, Loader2, User, Building2, MapPin, Phone, Package, AlertTriangle, Check, ChevronDown, Wand2, X, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface Category {
    _id: string;
    name: string;
}

interface PurchasedItem {
    product_name: string;
    price: number;
}

interface CustomerData {
    _id: string;
    name: string;
    mobile_number: string;
    business_name: string;
    place: string;
    purchased_items: PurchasedItem[];
    business_category_id: { _id: string; name: string };
    created_at: string;
}

export default function DataEntryPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [leads, setLeads] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        mobile_number: '',
        business_name: '',
        place: '',
        business_category_id: '',
        purchased_items: [] as PurchasedItem[]
    });

    // Smart Paste State
    const [smartPasteText, setSmartPasteText] = useState('');
    const [isPasting, setIsPasting] = useState(false);

    // New Item State for the Dynamic List
    const [newItem, setNewItem] = useState({ product_name: '', price: '' });

    // Check Customer Exists
    const [customerExists, setCustomerExists] = useState(false);
    const [checkingMobile, setCheckingMobile] = useState(false);

    // Create Category inline state
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [savingCategory, setSavingCategory] = useState(false);

    // Custom Select State
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catRes, leadRes] = await Promise.all([
                api.get('/admin/crm/categories'),
                api.get('/admin/crm/leads')
            ]);
            setCategories(catRes.data.data);
            setLeads(leadRes.data.data.data);
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check Mobile Number Debounce
    useEffect(() => {
        const number = form.mobile_number.trim();
        if (number.length >= 7) {
            setCheckingMobile(true);
            const timer = setTimeout(async () => {
                try {
                    const res = await api.get(`/admin/crm/leads/check-mobile/${encodeURIComponent(number)}`);
                    setCustomerExists(res.data.data.exists);
                } catch (e) {
                    setCustomerExists(false);
                } finally {
                    setCheckingMobile(false);
                }
            }, 600);
            return () => clearTimeout(timer);
        } else {
            setCustomerExists(false);
            setCheckingMobile(false);
        }
    }, [form.mobile_number]);

    const extractField = (text: string, regexList: RegExp[]) => {
        for (const regex of regexList) {
            const match = text.match(regex);
            if (match && match[1]) return match[1].trim();
        }
        return '';
    };

    const handleSmartPaste = () => {
        if (!smartPasteText.trim()) return;
        setIsPasting(true);

        const text = smartPasteText;

        const extractedName = extractField(text, [/Contact Person:\s*(.+)/i, /Name:\s*(.+)/i]);
        const extractedBusiness = extractField(text, [/Business Name:\s*(.+)/i, /Business:\s*(.+)/i]);
        const extractedMobile = extractField(text, [/Mobile Number:\s*(.+)/i, /Phone:\s*(.+)/i, /Mobile:\s*(.+)/i]);
        const extractedPlace = extractField(text, [/City:\s*(.+)/i, /Place:\s*(.+)/i]);
        const extractedCategory = extractField(text, [/Business Category:\s*(.+)/i, /Category:\s*(.+)/i]);

        let matchedCategoryId = '';
        if (extractedCategory) {
            const match = categories.find(c => c.name.toLowerCase() === extractedCategory.toLowerCase());
            if (match) {
                matchedCategoryId = match._id;
            } else {
                // If it doesn't exist, we put the text in the new category input and open the inline create state
                setNewCategoryName(extractedCategory);
                setIsCreatingCategory(true);
            }
        }

        setForm({
            ...form,
            name: extractedName || form.name,
            business_name: extractedBusiness || form.business_name,
            mobile_number: extractedMobile || form.mobile_number,
            place: extractedPlace || form.place,
            business_category_id: matchedCategoryId || form.business_category_id
        });

        // Clear the paste box so it's clean
        setSmartPasteText('');
        setIsPasting(false);
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            setSavingCategory(true);
            const res = await api.post('/admin/crm/categories', { name: newCategoryName });
            const newCat = res.data.data;
            setCategories([...categories, newCat]);
            setForm({ ...form, business_category_id: newCat._id });
            setIsCreatingCategory(false);
            setNewCategoryName('');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create category');
        } finally {
            setSavingCategory(false);
        }
    };

    const handleAddItem = () => {
        if (!newItem.product_name.trim() || !newItem.price) return;
        setForm({
            ...form,
            purchased_items: [
                ...form.purchased_items,
                { product_name: newItem.product_name, price: Number(newItem.price) }
            ]
        });
        setNewItem({ product_name: '', price: '' });
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...form.purchased_items];
        updated.splice(index, 1);
        setForm({ ...form, purchased_items: updated });
    };

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post('/admin/crm/leads', form);
            await fetchData();
            setForm({ name: '', mobile_number: '', business_name: '', place: '', business_category_id: '', purchased_items: [] });
            setIsFormOpen(false);
            setCustomerExists(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save entry');
        } finally {
            setSaving(false);
        }
    };

    const selectedCategoryName = categories.find(c => c._id === form.business_category_id)?.name || 'Select a category...';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-mochingo-warm-oat flex items-center gap-3">
                        <Database className="text-mochingo-warm-oat" />
                        Customer Data
                    </h1>
                    <p className="text-mochingo-warm-oat/60 mt-2">
                        Record and manage purchased customer details.
                    </p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="px-5 py-2.5 bg-mochingo-warm-oat text-mochingo-rich-black font-bold rounded-xl hover:bg-mochingo-warm-oat/90 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(242,237,231,0.2)]"
                >
                    <Plus size={18} />
                    New Entry
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-mochingo-warm-oat" size={32} />
                </div>
            ) : (
                <div className="bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 rounded-2xl overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-mochingo-warm-oat/10 bg-mochingo-warm-oat/[0.02] text-xs uppercase tracking-wider text-mochingo-warm-oat/50">
                                    <th className="p-4 font-semibold w-1/4">Customer</th>
                                    <th className="p-4 font-semibold w-1/4">Business</th>
                                    <th className="p-4 font-semibold w-1/3">Purchased Info</th>
                                    <th className="p-4 font-semibold">Category</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-mochingo-warm-oat/5">
                                {leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-mochingo-warm-oat/50">
                                            No customer data recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => {
                                        const total = lead.purchased_items?.reduce((sum, item) => sum + item.price, 0) || 0;
                                        return (
                                            <tr key={lead._id} className="hover:bg-mochingo-warm-oat/[0.02] transition-colors">
                                                <td className="p-4 align-top space-y-1">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-mochingo-warm-oat">
                                                        <User size={14} className="text-mochingo-warm-oat/40" />
                                                        {lead.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/60">
                                                        <Phone size={12} className="text-mochingo-warm-oat/40 ml-0.5" />
                                                        {lead.mobile_number}
                                                    </div>
                                                    <div className="text-[10px] text-mochingo-warm-oat/40 pt-1">
                                                        {new Date(lead.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top space-y-1">
                                                    <div className="flex items-center gap-1.5 text-sm text-mochingo-warm-oat">
                                                        <Building2 size={14} className="text-mochingo-warm-oat/40" />
                                                        {lead.business_name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/60">
                                                        <MapPin size={12} className="text-mochingo-warm-oat/40 ml-0.5" />
                                                        {lead.place}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top">
                                                    {lead.purchased_items && lead.purchased_items.length > 0 ? (
                                                        <div className="space-y-2">
                                                            <div className="space-y-1 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {lead.purchased_items.map((item, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-[rgba(242,237,231,0.03)] px-2.5 py-1.5 rounded-lg border border-mochingo-warm-oat/5">
                                                                        <div className="flex items-center gap-1.5 truncate text-mochingo-warm-oat/80">
                                                                            <Package size={12} className="text-mochingo-warm-oat/40 shrink-0" />
                                                                            <span className="truncate">{item.product_name}</span>
                                                                        </div>
                                                                        <span className="font-medium text-emerald-400/90 shrink-0">₹{item.price.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-mochingo-warm-oat/10 px-1">
                                                                <span className="text-[10px] uppercase font-bold text-mochingo-warm-oat/50 tracking-wider">Total</span>
                                                                <span className="text-sm font-bold text-emerald-400">₹{total.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs italic text-mochingo-warm-oat/30">No items recorded</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-top">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-mochingo-warm-oat/10 text-mochingo-warm-oat border border-mochingo-warm-oat/20">
                                                        {lead.business_category_id?.name || 'Uncategorized'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-mochingo-warm-oat/10">
                        {leads.length === 0 ? (
                            <div className="p-8 text-center text-mochingo-warm-oat/50 text-sm">
                                No customer data recorded yet.
                            </div>
                        ) : (
                            leads.map((lead) => {
                                const total = lead.purchased_items?.reduce((sum, item) => sum + item.price, 0) || 0;
                                return (
                                    <div key={lead._id} className="p-4 space-y-4 hover:bg-mochingo-warm-oat/[0.02] transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-mochingo-warm-oat">
                                                    <User size={14} className="text-mochingo-warm-oat/40" />
                                                    {lead.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/60">
                                                    <Phone size={12} className="text-mochingo-warm-oat/40 ml-0.5" />
                                                    {lead.mobile_number}
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-mochingo-warm-oat/10 text-mochingo-warm-oat border border-mochingo-warm-oat/20">
                                                {lead.business_category_id?.name || 'Uncategorized'}
                                            </span>
                                        </div>

                                        <div className="space-y-1 bg-mochingo-rich-black/50 p-3 rounded-xl border border-mochingo-warm-oat/5">
                                            <div className="flex items-center gap-1.5 text-sm text-mochingo-warm-oat">
                                                <Building2 size={14} className="text-mochingo-warm-oat/40" />
                                                {lead.business_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/60">
                                                <MapPin size={12} className="text-mochingo-warm-oat/40 ml-0.5" />
                                                {lead.place}
                                            </div>
                                        </div>

                                        <div className="bg-[rgba(242,237,231,0.02)] p-3 rounded-xl border border-mochingo-warm-oat/5 space-y-3">
                                            {lead.purchased_items && lead.purchased_items.length > 0 ? (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {lead.purchased_items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                                <div className="flex items-center gap-1.5 text-mochingo-warm-oat/80">
                                                                    <Package size={12} className="text-mochingo-warm-oat/40" />
                                                                    {item.product_name}
                                                                </div>
                                                                <span className="text-emerald-400/90 font-medium">₹{item.price.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t border-mochingo-warm-oat/10">
                                                        <span className="text-[10px] uppercase font-bold text-mochingo-warm-oat/50 tracking-wider">Total</span>
                                                        <span className="text-sm font-bold text-emerald-400">₹{total.toLocaleString()}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs italic text-mochingo-warm-oat/30 block text-center">No items recorded</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-mochingo-warm-oat/10 shrink-0 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-mochingo-warm-oat">New Customer Data</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-mochingo-warm-oat/50 hover:text-mochingo-warm-oat transition-colors p-1 rounded-lg hover:bg-mochingo-warm-oat/10">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto p-5 space-y-6">
                            
                            {/* Smart Paste Section */}
                            <div className="bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-bold text-mochingo-warm-oat">
                                        <Wand2 size={16} className="text-emerald-400" />
                                        Smart Auto-Fill
                                    </div>
                                </div>
                                <div className="relative">
                                    <textarea
                                        rows={3}
                                        placeholder="Paste details here (e.g. 🏢 Business Name: GALAXY...)"
                                        value={smartPasteText}
                                        onChange={(e) => setSmartPasteText(e.target.value)}
                                        className="w-full bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-lg px-3 py-2 text-sm text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors placeholder:text-mochingo-warm-oat/30 resize-none"
                                    />
                                    {smartPasteText.trim() && (
                                        <button
                                            type="button"
                                            onClick={handleSmartPaste}
                                            disabled={isPasting}
                                            className="absolute bottom-2 right-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            {isPasting ? <Loader2 size={14} className="animate-spin" /> : 'Extract Details'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <form id="dataEntryForm" onSubmit={handleSaveEntry} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Mobile Number *</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            required
                                            value={form.mobile_number}
                                            onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                                            className={`w-full bg-[rgba(242,237,231,0.03)] border ${customerExists ? 'border-amber-500/50' : 'border-mochingo-warm-oat/10'} rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors`}
                                        />
                                        {checkingMobile && (
                                            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-mochingo-warm-oat/40" />
                                        )}
                                    </div>
                                    {customerExists && (
                                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                                            <AlertTriangle size={14} />
                                            This customer has previously purchased items!
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Customer Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Place *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.place}
                                            onChange={(e) => setForm({ ...form, place: e.target.value })}
                                            className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Business Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.business_name}
                                        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                                        className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Business Category *</label>
                                    {!isCreatingCategory ? (
                                        <div className="flex gap-2">
                                            <div className="relative flex-1" ref={selectRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                                                    className="w-full flex items-center justify-between bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors text-left"
                                                >
                                                    <span className={!form.business_category_id ? 'text-mochingo-warm-oat/50' : ''}>
                                                        {selectedCategoryName}
                                                    </span>
                                                    <ChevronDown size={16} className={`text-mochingo-warm-oat/50 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                
                                                {isSelectOpen && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-mochingo-rich-black border border-mochingo-warm-oat/20 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden max-h-48 overflow-y-auto">
                                                        {categories.map(c => (
                                                            <button
                                                                key={c._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm({ ...form, business_category_id: c._id });
                                                                    setIsSelectOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${form.business_category_id === c._id ? 'bg-mochingo-warm-oat/10 text-mochingo-warm-oat font-medium' : 'text-mochingo-warm-oat/80 hover:bg-mochingo-warm-oat/5'}`}
                                                            >
                                                                {c.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingCategory(true)}
                                                className="w-[46px] shrink-0 flex items-center justify-center bg-mochingo-warm-oat/10 hover:bg-mochingo-warm-oat/20 text-mochingo-warm-oat rounded-xl transition-colors border border-mochingo-warm-oat/20"
                                                title="Add New Category"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Enter new category name..."
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="flex-1 bg-[rgba(242,237,231,0.03)] border border-emerald-500/30 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-mochingo-warm-oat/30"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateCategory}
                                                disabled={!newCategoryName.trim() || savingCategory}
                                                className="px-3 shrink-0 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors border border-emerald-500/20 disabled:opacity-50"
                                            >
                                                {savingCategory ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingCategory(false)}
                                                className="px-3 shrink-0 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-mochingo-warm-oat/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-bold text-mochingo-warm-oat">Purchased Items</label>
                                        <span className="text-xs text-mochingo-warm-oat/50 bg-mochingo-warm-oat/5 px-2 py-1 rounded-md border border-mochingo-warm-oat/10 font-medium">
                                            Total: ₹{form.purchased_items.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2 mb-3">
                                        {form.purchased_items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 rounded-lg p-2 px-3">
                                                <Package size={14} className="text-mochingo-warm-oat/40 shrink-0" />
                                                <span className="flex-1 text-sm text-mochingo-warm-oat truncate">{item.product_name}</span>
                                                <span className="text-sm font-medium text-emerald-400">₹{item.price.toLocaleString()}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="ml-2 p-1.5 text-mochingo-warm-oat/30 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Product Name (e.g. NFC Standee)"
                                            value={newItem.product_name}
                                            onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                                            className="flex-[2] bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-3 py-2 text-sm text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors placeholder:text-mochingo-warm-oat/30"
                                        />
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mochingo-warm-oat/40">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                                className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl pl-7 pr-3 py-2 text-sm text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors placeholder:text-mochingo-warm-oat/30"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            disabled={!newItem.product_name.trim() || !newItem.price}
                                            className="shrink-0 px-4 flex items-center justify-center bg-mochingo-warm-oat/10 hover:bg-mochingo-warm-oat/20 text-mochingo-warm-oat text-sm font-medium rounded-xl transition-colors border border-mochingo-warm-oat/20 disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-5 border-t border-mochingo-warm-oat/10 shrink-0 flex justify-end gap-3 bg-[rgba(242,237,231,0.02)]">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-mochingo-warm-oat/10 text-mochingo-warm-oat/70 hover:bg-mochingo-warm-oat/5 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="dataEntryForm"
                                disabled={saving || !form.business_category_id}
                                className="px-6 py-2.5 rounded-xl bg-mochingo-warm-oat text-mochingo-rich-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-mochingo-warm-oat/90 shadow-[0_0_15px_rgba(242,237,231,0.15)]"
                            >
                                {saving ? <Loader2 className="animate-spin text-mochingo-rich-black" size={18} /> : 'Save Customer Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
