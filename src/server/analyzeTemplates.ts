import type { AnalyzeRequest, AnalyzeResponse } from '@/shared/schemas';

function clockString(hour: number): string {
  return `${String(((hour % 24) + 24) % 24).padStart(2, '0')}:00`;
}

export function buildTemplateAnalysis(req: AnalyzeRequest): AnalyzeResponse {
  const { question, regime, profile, toggles, engine } = req;
  const bestClock = clockString(engine.bestHour);
  const isClean = engine.bestHourLabel === 'clean_day';
  const hasSensitive = profile.sensitive !== 'none';

  if (question === 'why_not_plants') {
    return {
      headlineReason:
        'Potted indoor plants remove practically zero PM2.5 compared with sealing drafts or running active filtration.',
      tradeoffs: [
        'Leaf surfaces trap only negligible fine particulate matter at typical room airflows.',
        'A HEPA purifier or DIY box fan moves hundreds of cubic meters of air per hour through filter media.',
        'Keep plants for greenery, but rely on exhaust fans, draft sealing, and particle filters for smog.',
      ],
      nextMove:
        toggles.indoor === 'none'
          ? 'Switch Indoor Defense to draft sealing + kitchen exhaust or a DIY filter box.'
          : 'Keep your active indoor defense running during peak evening smog hours.',
      caveat:
        'Indoor filtration estimates assume doors and windows stay closed outside airing hours.',
      source: 'template',
    };
  }

  if (question === 'budget_sealing') {
    const cookingTip =
      profile.cooking === 'gas_no_exhaust'
        ? 'Crack a kitchen window briefly or run an exhaust fan strictly while cooking, then close up.'
        : 'Continue using your kitchen exhaust or induction setup to limit indoor cooking spikes.';
    return {
      headlineReason:
        'Simple under-₹500 steps—blocking door/window gaps and curbing cooking fumes—cut indoor PM2.5 infiltration noticeably.',
      tradeoffs: [
        'Rolled towels or foam weatherstripping along balcony and main-door gaps slow smoky outdoor air leaks.',
        cookingTip,
        `Concentrate cross-ventilation into a brief burst around ${bestClock} instead of leaving windows ajar all day.`,
      ],
      nextMove: 'Seal the largest window or door draft gap with foam tape or rolled cloth first.',
      caveat:
        'Tightly sealing rooms without filtration means indoor cooking fumes linger longer if unvented.',
      source: 'template',
    };
  }

  if (question === 'sensitive_member') {
    const groupNote = hasSensitive
      ? 'For children, older adults, or anyone with breathing sensitivity, shifting outdoor chores to the cleanest window lowers peak exposure.'
      : 'Even without sensitive members, reducing indoor peaks protects everyone during prolonged smog episodes.';
    return {
      headlineReason: isClean
        ? 'Outdoor air is relatively clean today, so normal daytime activity with basic kitchen venting works well.'
        : `Timing outdoor errands near ${bestClock} and keeping indoor air cleaner reduces peak fine-particle inhalation.`,
      tradeoffs: [
        groupNote,
        'When outdoor air stays poor, a well-fitted N95 mask helps during commutes more than cloth masks.',
        'Avoid vigorous outdoor exercise during evening traffic and inversion hours.',
      ],
      nextMove: hasSensitive
        ? 'Keep sensitive household members indoors during evening hours and use the cleanest daytime window.'
        : 'Schedule outdoor errands around the cleanest daytime hour shown above.',
      caveat:
        'This simulator estimates time-weighted concentration, not medical risk—consider checking with a doctor.',
      source: 'template',
    };
  }

  // Default: 'overview'
  if (isClean) {
    return {
      headlineReason: `Outdoor air is in the clean range today, with the freshest hour around ${bestClock}.`,
      tradeoffs: [
        'When outdoor PM2.5 is low, airing the home clears indoor cooking particles effectively.',
        'Keeping kitchen exhaust on during cooking prevents short indoor spikes.',
        'Sharing rides or taking metro/walk still cuts daily community tailpipe emissions.',
      ],
      nextMove: `Air out rooms freely around ${bestClock} and keep commuting low-emission.`,
      caveat:
        'Modeled forecasts reflect regional averages (~45 km grid) rather than roadside monitors.',
      source: 'template',
    };
  }

  const regimeText =
    regime === 'combustion'
      ? 'Fine combustion smoke (high PM2.5 relative to PM10) penetrates indoors easily through gaps.'
      : regime === 'dust'
        ? 'Coarser dust is a larger share today, so closing windward windows and wet-mopping helps alongside filtration.'
        : 'Today shows a mix of combustion particles and dust, making both timing and indoor defense useful.';

  const nextMove =
    toggles.indoor === 'none'
      ? 'Turn on Seal + Exhaust or a DIY/HEPA filter to bend your indoor exposure curve downward.'
      : !toggles.smartTiming
        ? `Enable Smart Timing to move your outdoor errand and airing hour to ${bestClock}.`
        : toggles.travel === 'solo_car'
          ? 'Try Carpool or Metro + Walk to trim community CO2e and NOx emissions.'
          : 'Keep your active indoor and timing plan steady through tonight’s peak.';

  return {
    headlineReason: `${regimeText} Your cleanest daytime window is around ${bestClock}.`,
    tradeoffs: [
      toggles.smartTiming
        ? `Shifting airing to ${bestClock} avoids flushing your home with peak-smog air.`
        : `Moving airing from early morning to ${bestClock} avoids trapping heavier morning/evening smog.`,
      toggles.indoor === 'none'
        ? 'Without sealing or filtration, indoor PM2.5 tracks outdoor smog closely plus cooking spikes.'
        : 'Active indoor defense lowers indoor buildup between airing windows.',
      'Travel choices shift community tailpipe emissions rather than your personal indoor curve.',
    ],
    nextMove,
    caveat:
      'Forecasts are modeled regional estimates, not ground-sensor readings or medical advice.',
    source: 'template',
  };
}
