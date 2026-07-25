'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, AlertCircle } from 'lucide-react';
import Script from 'next/script';

interface GooglePlaceSearchProps {
    onPlaceSelected: (placeId: string, address: string, name: string) => void;
    error?: string;
    clearError?: () => void;
}

export default function GooglePlaceSearch({ onPlaceSelected, error, clearError }: GooglePlaceSearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        // Debugging the API key on the client side
        console.log('🔍 ENV CHECK: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is:', apiKey ? `Present (Starts with ${apiKey.substring(0, 6)}...)` : 'UNDEFINED');
    }, [apiKey]);

    useEffect(() => {
        if (!isScriptLoaded || !inputRef.current || !window.google) return;

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            fields: ['place_id', 'formatted_address', 'name'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place && place.place_id) {
                setInputValue(place.name || place.formatted_address || '');
                onPlaceSelected(place.place_id, place.formatted_address || '', place.name || '');
                if (clearError) clearError();
            }
        });

        // Prevent form submission on enter
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        };
        inputRef.current.addEventListener('keydown', handleKeyDown);

        return () => {
            if (inputRef.current) {
                inputRef.current.removeEventListener('keydown', handleKeyDown);
            }
            if (window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current!);
            }
        };
    }, [isScriptLoaded, onPlaceSelected, clearError]);

    if (!apiKey) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm leading-relaxed">
                    Google Maps API Key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file to enable location search.
                </p>
            </div>
        );
    }

    return (
        <>
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
                onLoad={() => setIsScriptLoaded(true)}
                strategy="lazyOnload"
            />
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {isScriptLoaded ? (
                        <Search size={18} className={isFocused ? 'text-indigo-600' : 'text-slate-400'} />
                    ) : (
                        <Loader2 size={18} className="text-slate-400 animate-spin" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className={`w-full h-14 pl-11 pr-4 bg-[#fafafa] border rounded-2xl focus:outline-none focus:ring-4 transition-all text-slate-900 font-medium placeholder-slate-400 text-sm shadow-xs ${
                        error
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100/80'
                    }`}
                    placeholder="Search for your business (e.g., Dynleaf Technologies)"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (error && clearError) clearError();
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={!isScriptLoaded}
                />
            </div>
        </>
    );
}
