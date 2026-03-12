import { useState, useMemo, useCallback } from 'react';
import type { MeasureMode, MeasureUnit, Measurement } from '../utils/measure';
import { calculateMeasurement, defaultUnitForMode, buildMeasureGeometryData, buildMeasurePointsData } from '../utils/measure';

export interface UseMeasureResult {
  mode: MeasureMode | null;
  points: [number, number][];
  unit: MeasureUnit;
  measurement: Measurement | null;
  geometryData: GeoJSON.Feature | null;
  pointsData: GeoJSON.FeatureCollection | null;
  setMode: (mode: MeasureMode | null) => void;
  setUnit: (unit: MeasureUnit) => void;
  addPoint: (point: [number, number]) => void;
  clear: () => void;
}

export function useMeasure(): UseMeasureResult {
  const [mode, setModeState] = useState<MeasureMode | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [unit, setUnit] = useState<MeasureUnit>('km');

  const measurement = useMemo<Measurement | null>(
    () => mode ? calculateMeasurement(mode, points, unit) : null,
    [mode, points, unit],
  );

  const geometryData = useMemo(
    () => mode ? buildMeasureGeometryData(mode, points) : null,
    [mode, points],
  );

  const pointsData = useMemo(
    () => mode ? buildMeasurePointsData(points) : null,
    [mode, points],
  );

  const setMode = useCallback((newMode: MeasureMode | null) => {
    setModeState(newMode);
    setPoints([]);
    if (newMode) setUnit(defaultUnitForMode(newMode));
  }, []);

  const addPoint = useCallback((point: [number, number]) => {
    setPoints((prev) => [...prev, point]);
  }, []);

  const clear = useCallback(() => {
    setPoints([]);
  }, []);

  return { mode, points, unit, measurement, geometryData, pointsData, setMode, setUnit, addPoint, clear };
}
