import type { BriefRequest, BriefResponse } from '@/shared/schemas';

function describeIndoorEn(indoor: BriefRequest['toggles']['indoor']): string {
  switch (indoor) {
    case 'none':
      return 'keep indoor monitoring on';
    case 'seal_exhaust':
      return 'seal window/door drafts + run kitchen exhaust';
    case 'diy_box':
      return 'run DIY filter box indoors';
    case 'hepa':
      return 'run HEPA purifier indoors';
  }
}

function describeTravelEn(travel: BriefRequest['toggles']['travel']): string {
  switch (travel) {
    case 'solo_car':
      return 'solo car commute';
    case 'carpool':
      return '3-person carpool';
    case 'metro_walk':
      return 'metro + walk commute';
  }
}

function describeIndoorHi(indoor: BriefRequest['toggles']['indoor']): string {
  switch (indoor) {
    case 'none':
      return 'सामान्य स्थिति (अतिरिक्त फ़िल्टर नहीं)';
    case 'seal_exhaust':
      return 'दरवाजे-खिड़कियों की दरारें बंद करें और रसोई में एग्जॉस्ट चलाएं';
    case 'diy_box':
      return 'घर के अंदर DIY बॉक्स फ़िल्टर चलाएं';
    case 'hepa':
      return 'घर के अंदर HEPA एयर प्यूरीफायर चलाएं';
  }
}

function describeTravelHi(travel: BriefRequest['toggles']['travel']): string {
  switch (travel) {
    case 'solo_car':
      return 'अकेले कार से यात्रा';
    case 'carpool':
      return '3 लोगों की कारपूल';
    case 'metro_walk':
      return 'मेट्रो और पैदल यात्रा';
  }
}

function describeLabelEn(label: BriefRequest['engine']['bestHourLabel']): string {
  switch (label) {
    case 'clean_day':
      return 'clean air day';
    case 'safe_window':
      return 'meets CPCB 24-h standard';
    case 'least_bad':
      return 'no safe window — least-bad hour';
  }
}

function describeLabelHi(label: BriefRequest['engine']['bestHourLabel']): string {
  switch (label) {
    case 'clean_day':
      return 'साफ़ हवा वाला दिन';
    case 'safe_window':
      return 'CPCB 24-घंटे के मानक के भीतर';
    case 'least_bad':
      return 'कोई सुरक्षित समय नहीं — सबसे कम खराब घंटा';
  }
}

export function buildBrief(req: BriefRequest): BriefResponse {
  const dateStr = new Date().toISOString().slice(0, 10);
  const co2e = Math.round(req.engine.co2eKg * 10) / 10;
  const nox = Math.round(req.engine.noxG * 10) / 10;

  if (req.lang === 'hi') {
    const text = [
      `स्मॉग संक्षिप्त नोट — ${req.cityName} (${dateStr})`,
      `बाहर निकलने या घर की हवा बदलने का सबसे साफ़ समय: ${req.bestHourClock} (${describeLabelHi(req.engine.bestHourLabel)})।`,
      `घरेलू योजना: ${describeIndoorHi(req.toggles.indoor)}; ${describeTravelHi(req.toggles.travel)}।`,
      `यदि हमारी सोसाइटी के ${req.toggles.households} परिवार यह बदलाव करें: लगभग ${co2e} किग्रा CO2e और ${nox} ग्राम NOx प्रतिदिन कम होगा (अनुमानित उदाहरण)।`,
      `डेटा: Open-Meteo मॉडल पूर्वानुमान (ज़मीनी सेंसर नहीं)।`,
    ].join('\n');
    return { text, lang: 'hi' };
  }

  const text = [
    `Smog brief — ${req.cityName} (${dateStr})`,
    `Cleanest hour to step out or air the house: ${req.bestHourClock} (${describeLabelEn(req.engine.bestHourLabel)}).`,
    `Household plan: ${describeIndoorEn(req.toggles.indoor)}; ${describeTravelEn(req.toggles.travel)}.`,
    `If ${req.toggles.households} families in our society do this: ~${co2e} kg CO2e and ~${nox} g NOx avoided/day (illustrative).`,
    `Data: Open-Meteo modeled forecast (not a ground sensor).`,
  ].join('\n');
  return { text, lang: 'en' };
}
