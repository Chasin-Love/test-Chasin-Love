import { CosmicBody, DiaryEntry } from '../types';
import { CosmicLineage, GalaxyClusterData } from './hierarchyTypes';

export * from './hierarchyTypes';

export interface RealityConfig {
  id: string;
  name: string;
  codeName: string;
  spectral: string;
  description: string;
  bubblePos: [number, number, number];
  bubbleSize: number;
  colorA: string;
  colorB: string;
  starColor: string;
  bodies: CosmicBody[];
  entries: DiaryEntry[];
  clusters?: GalaxyClusterData[];
  homeLineage?: CosmicLineage;
}

