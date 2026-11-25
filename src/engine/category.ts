export type CpcbBandKey =
  'good' | 'satisfactory' | 'moderately_polluted' | 'poor' | 'very_poor' | 'severe';

export interface CpcbCategory {
  readonly band: CpcbBandKey;
  readonly label: string;
  readonly icon: string;
  readonly colorToken: string;
  readonly rangeText: string;
}

export function getCpcbPm25Category(pm25: number): CpcbCategory {
  const safeVal = Math.max(0, pm25);

  if (safeVal <= 30) {
    return {
      band: 'good',
      label: 'Good',
      icon: 'check-circle',
      colorToken: 'emerald',
      rangeText: '0-30',
    };
  }
  if (safeVal <= 60) {
    return {
      band: 'satisfactory',
      label: 'Satisfactory',
      icon: 'minus-circle',
      colorToken: 'lime',
      rangeText: '31-60',
    };
  }
  if (safeVal <= 90) {
    return {
      band: 'moderately_polluted',
      label: 'Moderately Polluted',
      icon: 'alert-circle',
      colorToken: 'amber',
      rangeText: '61-90',
    };
  }
  if (safeVal <= 120) {
    return {
      band: 'poor',
      label: 'Poor',
      icon: 'alert-triangle',
      colorToken: 'orange',
      rangeText: '91-120',
    };
  }
  if (safeVal <= 250) {
    return {
      band: 'very_poor',
      label: 'Very Poor',
      icon: 'shield-alert',
      colorToken: 'red',
      rangeText: '121-250',
    };
  }
  return {
    band: 'severe',
    label: 'Severe',
    icon: 'octagon-alert',
    colorToken: 'rose',
    rangeText: '250+',
  };
}
