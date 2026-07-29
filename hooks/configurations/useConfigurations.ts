'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppointmentConfig, DEFAULT_CONFIG, getEffectiveConfigForDate } from '@/utils/configurations';

interface UseConfigurationsReturn {
  config: AppointmentConfig | null;
  loading: boolean;
  error: string | null;
  updateConfig: (newConfig: AppointmentConfig) => Promise<boolean>;
  getEffectiveForDate: (dateStr: string) => ReturnType<typeof getEffectiveConfigForDate>;
}

export function useConfigurations(): UseConfigurationsReturn {
  const [config, setConfig] = useState<AppointmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/configurations?module=appointments');
      const json = await res.json();
      if (json.error) {
        setError(json.errorMessage || 'Failed to fetch configuration.');
        setConfig(null);
      } else if (json.data) {
        // Merge with defaults
        const dbConfig = json.data.config || {};
        const merged: AppointmentConfig = {
          global: {
            openingTime: dbConfig.global?.openingTime || DEFAULT_CONFIG.global.openingTime,
            closingTime: dbConfig.global?.closingTime || DEFAULT_CONFIG.global.closingTime,
            capacity: dbConfig.global?.capacity ?? DEFAULT_CONFIG.global.capacity,
          },
          dateOverrides: dbConfig.dateOverrides || {},
        };
        setConfig(merged);
        setError(null);
      } else {
        // No config found, use defaults
        setConfig(DEFAULT_CONFIG);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching configuration.');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (newConfig: AppointmentConfig): Promise<boolean> => {
    try {
      const res = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'appointments', config: newConfig }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.errorMessage || 'Failed to update configuration.');
        return false;
      }
      setConfig(newConfig);
      setError(null);
      return true;
    } catch (e: any) {
      setError(e.message || 'Error updating configuration.');
      return false;
    }
  }, []);

  const getEffectiveForDate = useCallback(
    (dateStr: string) => {
      if (!config) return getEffectiveConfigForDate(DEFAULT_CONFIG, dateStr);
      return getEffectiveConfigForDate(config, dateStr);
    },
    [config]
  );

  return { config, loading, error, updateConfig, getEffectiveForDate };
}