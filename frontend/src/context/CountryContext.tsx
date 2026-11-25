import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../services/api';
import { CountryView } from '../types';
import { useAuth } from './AuthContext';

const MARKET_COUNTRY_KEY = 'mc_market_country';
const DELIVERY_COUNTRY_KEY = 'mc_delivery_country';
const COUNTRY_CONFIRMED_KEY = 'mc_country_confirmed';
const RECENT_COUNTRIES_KEY = 'mc_recent_countries';

interface CountryCtx {
  countries: CountryView[];
  marketCountry: string;
  deliveryCountry: string;
  recentCountries: string[];
  activeCountryObj: CountryView;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  selectCountries: (market: string, delivery: string) => void;
}

const DEFAULT_INDIA: CountryView = {
  code: 'IN',
  iso3: 'IND',
  name: 'India',
  flagEmoji: '🇮🇳',
  currencyCode: 'INR',
  currencySymbol: '₹',
  sizeSystem: 'IN/UK',
  region: 'Asia',
  defaultLocale: 'en-IN',
  dialCode: '+91',
  popular: true,
  exchangeRateToInr: 1,
  productCount: 0,
  datasetAvailable: true,
  availabilityStatus: 'CATALOGUE_AVAILABLE',
};

const CountryContext = createContext<CountryCtx | null>(null);

function safeReadStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeReadArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [marketCountry, setMarketCountry] = useState<string>(() => safeReadStorage(MARKET_COUNTRY_KEY, 'IN'));
  const [deliveryCountry, setDeliveryCountry] = useState<string>(() => safeReadStorage(DELIVERY_COUNTRY_KEY, 'IN'));
  const [recentCountries, setRecentCountries] = useState<string[]>(() => safeReadArray(RECENT_COUNTRIES_KEY));
  const [modalOpen, setModalOpen] = useState<boolean>(() => {
    if (import.meta.env.MODE === 'test') return false;
    try {
      return !localStorage.getItem(COUNTRY_CONFIRMED_KEY);
    } catch {
      return false;
    }
  });
  const syncedUserId = useRef<number | null>(null);

  const { data: countries = [DEFAULT_INDIA] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => unwrap<CountryView[]>(await api.get('/countries')),
    staleTime: 60_000,
  });

  const activeCountryObj = countries.find((c) => c.code === marketCountry) || countries[0] || DEFAULT_INDIA;

  useEffect(() => {
    try {
      localStorage.setItem(MARKET_COUNTRY_KEY, marketCountry);
      localStorage.setItem(DELIVERY_COUNTRY_KEY, deliveryCountry);
    } catch {
      // ignore
    }
  }, [marketCountry, deliveryCountry]);

  // Synchronize country preference on login
  useEffect(() => {
    if (!user) {
      syncedUserId.current = null;
      return;
    }
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;

    const confirmed = safeReadStorage(COUNTRY_CONFIRMED_KEY, '');
    if (confirmed === 'true') {
      api.patch('/users/country', {
        preferredCountry: marketCountry,
        preferredDeliveryCountry: deliveryCountry,
      }).catch(() => {});
    } else if (user.preferredCountry) {
      setMarketCountry(user.preferredCountry.toUpperCase());
      if (user.preferredDeliveryCountry) {
        setDeliveryCountry(user.preferredDeliveryCountry.toUpperCase());
      }
    }
  }, [user, marketCountry, deliveryCountry]);

  const selectCountries = (market: string, delivery: string) => {
    const nextMarket = market.toUpperCase();
    const nextDelivery = delivery.toUpperCase();
    setMarketCountry(nextMarket);
    setDeliveryCountry(nextDelivery);
    const nextRecent = [nextMarket, ...recentCountries.filter((c) => c !== nextMarket)].slice(0, 6);
    setRecentCountries(nextRecent);
    try {
      localStorage.setItem(MARKET_COUNTRY_KEY, nextMarket);
      localStorage.setItem(DELIVERY_COUNTRY_KEY, nextDelivery);
      localStorage.setItem(COUNTRY_CONFIRMED_KEY, 'true');
      localStorage.setItem(RECENT_COUNTRIES_KEY, JSON.stringify(nextRecent));
    } catch {
      // ignore
    }
    if (user) {
      api.patch('/users/country', {
        preferredCountry: nextMarket,
        preferredDeliveryCountry: nextDelivery,
      }).catch(() => {});
    }
    setModalOpen(false);
  };

  return (
    <CountryContext.Provider
      value={{
        countries,
        marketCountry,
        deliveryCountry,
        recentCountries,
        activeCountryObj,
        modalOpen,
        setModalOpen,
        selectCountries,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    return {
      countries: [DEFAULT_INDIA],
      marketCountry: 'IN',
      deliveryCountry: 'IN',
      recentCountries: [],
      activeCountryObj: DEFAULT_INDIA,
      modalOpen: false,
      setModalOpen: () => {},
      selectCountries: () => {},
    };
  }
  return ctx;
}
