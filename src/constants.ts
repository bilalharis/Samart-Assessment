
import { PerformanceTier } from "./types";

export const TIER_THRESHOLDS = {
    [PerformanceTier.MASTERED]: 85,
    [PerformanceTier.DEVELOPING]: 50,
};

export const TIER_COLORS = {
    [PerformanceTier.MASTERED]: 'bg-brand-green text-white',
    [PerformanceTier.DEVELOPING]: 'bg-brand-yellow text-black',
    [PerformanceTier.NEEDS_SUPPORT]: 'bg-brand-red text-white',
};

export const TIER_BORDERS = {
    [PerformanceTier.MASTERED]: 'border-brand-green',
    [PerformanceTier.DEVELOPING]: 'border-brand-yellow',
    [PerformanceTier.NEEDS_SUPPORT]: 'border-brand-red',
};