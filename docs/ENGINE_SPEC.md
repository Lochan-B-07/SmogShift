# Engine Specification

> Source of truth for all exposure, ventilation-window, CADR/ACH, fingerprint, and emission math (`src/engine/`).
> Extracted from `docs/IMPLEMENTATION.md` §8. Do not alter any constant or formula without updating this file and its fixtures.

## 8.1 Window and time handling
- Request Open-Meteo with `timezone=auto`, so `time` strings are local to the location.
- Build a **rolling 24-hour window** starting at the current local hour from the 48-hour response.
- Linearly interpolate isolated null hours. If $>3$ consecutive hours are null, return `{ ok: false, reason: 'insufficient_data' }` and show an error state.
- Map each hour's activity using its local hour-of-day (`0–23`).

## 8.2 Default routine (local clock)

| Hour | Activity | Exposure uses |
|---|---|---|
| 07 | Flexible outdoor hour (errand / school drop / walk); home airing | $C_{\text{out}}$ |
| 08, 20 | Cooking (indoors) | $C_{\text{in}}$ |
| 09 | Commute out | $C_{\text{out}}$ |
| 18 | Commute back | $C_{\text{out}}$ |
| All others | At home, indoors | $C_{\text{in}}$ |

State visibly in UI: *"Assumes non-commute hours are spent at home; workplace/school indoor air is not modeled."*

## 8.3 Indoor mass balance (exact per-hour step)

$$q = \frac{\text{CADR}}{V} \quad [\text{h}^{-1}], \qquad a = \lambda + k + q$$

$$C_{\text{ss}} = \frac{P \cdot \lambda \cdot C_{\text{out}} + S / V}{a} \quad [\mu\text{g/m}^3]$$

$$C_{\text{in}}[h+1] = C_{\text{ss}} + \left(C_{\text{in}}[h] - C_{\text{ss}}\right) \cdot e^{-a}$$

- $S$ is the indoor cooking source in $\mu\text{g/h}$, nonzero only during cooking hours (`08`, `20`).
- During the airing hour, $\lambda = \lambda_{\text{airing}}$. Otherwise $\lambda = \lambda_{\text{closed}}$ (or $\lambda_{\text{sealed}}$ when `indoor = 'seal_exhaust'`).
- Initial $C_{\text{in}}[0]$ equals steady state of hour 0 with $S = 0$.

## 8.4 Hand-computed fixtures (`src/engine/__fixtures__/`)

Shared parameters: $P = 0.9$, $k = 0.3\text{ h}^{-1}$, $V = 45\text{ m}^3$.

| # | Scenario | Inputs | Expected |
|---|---|---|---|
| F1 | Closed room steady state | $C_{\text{out}}=200,\; \lambda=1.0,\; \text{CADR}=0,\; S=0$ | $a=1.3,\; C_{\text{ss}} = 180/1.3 \approx 138.46$ |
| F2 | HEPA steady state | Same, $\text{CADR}=250$ | $q \approx 5.5556,\; a \approx 6.8556,\; C_{\text{ss}} \approx 26.26$ |
| F3 | One-hour step from clean | F1 with $C_{\text{in}}[0]=0$ | $C_{\text{in}}[1] = 138.4615 \cdot (1 - e^{-1.3}) \approx 100.73$ |
| F4 | Cooking source only | $C_{\text{out}}=0,\; \lambda=1.0,\; \text{CADR}=0,\; S=2000$ | $C_{\text{ss}} = (2000/45)/1.3 \approx 34.19$ |
| F5 | Meters | $\text{mean24}=60$ | $\text{pctWHO}=400,\; \text{cigEq} \approx 2.727$ |
| F6 | Cigarettes avoided | Baseline mean $90$, adjusted mean $45$ | $45/22 \approx 2.045$ |
| F7 | Emissions (real cited EFs) | `households=10`, `commuteKm=10`, `travel='metro_walk'` ($130 \to 25\text{ g CO}_2\text{e}$, $0.08 \to 0\text{ g NO}_x$) | $\text{co2eKg} = 21.0\text{ kg/day},\; \text{noxG} = 16.0\text{ g/day}$ |
| F8 | Window selection | 24 values with unique minimum at hour 14 | `bestHour = 14` |
| F9 | Window, all hazardous | $\min(C_{\text{out}}) = 180$ | `label = 'least_bad'` |
| F10 | Window, clean | $\min(C_{\text{out}}) = 20,\; \max(C_{\text{out}}) = 28$ | `label = 'clean_day'` |
| F11 | Induction + `seal_exhaust` | `cooking='induction'` ($S=400$), `indoor='seal_exhaust'` | $S_{\text{effective}} = \min(400, 800) = 400$ (never worsens to $800$) |

Property tests: higher CADR never raises $C_{\text{in}}$; as $\lambda \to \infty$, $C_{\text{in}} \to P \cdot C_{\text{out}}$; with $S=0$ and $C_{\text{out}}=0$, $C_{\text{in}}$ decays monotonically toward $0$.

## 8.5 Personal exposure and meters

$$E[h] = \begin{cases} C_{\text{in}}[h] & \text{if indoors} \\ C_{\text{out}}[h] & \text{if outdoors} \end{cases}, \qquad \text{mean24} = \frac{1}{24}\sum_{h=0}^{23} E[h]$$

$$\text{pctWHO} = \frac{\text{mean24}}{15} \times 100, \qquad \text{cigEq} = \frac{\text{mean24}}{22}, \qquad \text{cigAvoided} = \max\left(0,\; \frac{\text{baselineMean} - \text{adjustedMean}}{22}\right)$$

- Display `"N× the guideline"` when $\text{pctWHO} > 300\%$.
- Visible note: *"Time-weighted exposure concentration, not a medical inhaled dose (breathing rate and activity intensity are not modeled)."*

## 8.6 Smart timing
- Search hours `06:00–22:00` for minimum $C_{\text{out}}$ (ties resolve to earliest hour).
- When `smartTiming` is on, both the flexible outdoor hour and the airing hour move to `bestHour`.
- Label: `clean_day` if $\max(C_{\text{out}}) \le 30\,\mu\text{g/m}^3$; else `safe_window` if $\min(C_{\text{out}}) \le 60\,\mu\text{g/m}^3$ (CPCB 24-hr standard); else `least_bad`.
- Display shading span: `bestHour` plus up to one adjacent hour within 15% of the minimum.
- Never hardcode clock hours; always derive strictly from the live hourly array.

## 8.7 Indoor toggle effects

| `indoor` | $\lambda_{\text{closed}}$ ($\text{h}^{-1}$) | CADR ($\text{m}^3/\text{h}$) | Effective cooking $S$ ($\mu\text{g/h}$) |
|---|---|---|---|
| `none` | `1.0` | `0` | `profileCookingS` |
| `seal_exhaust` | `0.6` | `0` | `Math.min(profileCookingS, 800)` |
| `diy_box` | `1.0` | `200` | `profileCookingS` |
| `hepa` | `1.0` | `250` | `profileCookingS` |

The CADR drawer additionally compares HEPA ($250\text{ m}^3/\text{h}$), DIY Corsi-Rosenthal box ($200\text{ m}^3/\text{h}$), and indoor potted plants ($\approx 0\text{ m}^3/\text{h}$, included explicitly for myth-busting).

## 8.8 Emissions (community meter)

$$\Delta = \text{households} \times 2\text{ trips/day} \times \text{commuteKm} \times (\text{EF}_{\text{solo}} - \text{EF}_{\text{mode}})$$

- `carpool`: $\text{EF}_{\text{mode}} = \text{EF}_{\text{solo}} / 3$ (assumed occupancy of 3, labeled as assumption).
- `metro_walk`: $\text{EF}_{\text{mode}}$ = electric metro per-passenger-km factor.
- Headline outputs: **kg $\text{CO}_2\text{e}$/day** and **g $\text{NO}_x$/day**.
- Footnote: *"Tailpipe $\text{PM}_{2.5}$ from a car swap is small compared with road dust and biomass burning, so we headline $\text{CO}_2\text{e}$ and $\text{NO}_x$. Travel toggles affect community emissions only; in-vehicle exposure is not modeled."*
- UI label: *"Illustrative scenario: if $N$ households in your society make this swap. Not a forecast of neighborhood air quality."*

## 8.9 Constants (`src/engine/constants.ts`)
Every constant exports `{ value, unit, source }`.

| Constant | Value | Source / Status |
|---|---|---|
| WHO 24-h $\text{PM}_{2.5}$ guideline | $15\,\mu\text{g/m}^3$ | WHO Global Air Quality Guidelines (2021) |
| CPCB 24-h $\text{PM}_{2.5}$ standard | $60\,\mu\text{g/m}^3$ | India NAAQS (CPCB) |
| Cigarette equivalence | $22\,\mu\text{g/m}^3$ per cig/day | Berkeley Earth heuristic (rough rule of thumb) |
| Penetration $P$ | $0.9$ | Assumption (typical range $0.7\text{–}1.0$) |
| Deposition $k$ | $0.3\text{ h}^{-1}$ | Assumption (typical range $0.1\text{–}0.5$) |
| $\lambda$ closed / sealed / airing | $1.0 / 0.6 / 5.0\text{ h}^{-1}$ | Assumption (Indian apartment leakage varies widely) |
| Room volume S / M / L | $30 / 45 / 70\text{ m}^3$ | Assumption (e.g., $10 \times 10\text{ ft}$ to $16 \times 15\text{ ft} \times 10\text{ ft}$) |
| CADR HEPA / DIY box / plants | $250 / 200 / 0\text{ m}^3/\text{h}$ | Typical mid-size HEPA; Corsi-Rosenthal box studies; plants negligible |
| Cooking $S$: gas no exhaust / gas exhaust / induction | $2000 / 800 / 400\,\mu\text{g/h}$ | Assumption (order-of-magnitude indoor cooking emission tiers) |
| Carpool occupancy | $3$ | Assumption |
| Petrol car ($<1400\text{ cc}$, solo) $\text{CO}_2\text{e}$ | $130\text{ g/km}$ | India GHG Program (WRI India / CII / TERI, 2015) |
| Petrol car (solo) $\text{NO}_x$ | $0.08\text{ g/km}$ | ARAI / CPCB BS-IV petrol passenger car benchmark |
| Metro rail (electric) $\text{CO}_2\text{e}$ | $25\text{ g/pkm}$ | Mumbai Metro LCA (ScienceDirect, 2024; conservative upper bound) |
| Metro rail (electric) local $\text{NO}_x$ | $0\text{ g/pkm}$ | Zero urban tailpipe $\text{NO}_x$ |
| Exposure hit: `traffic_jam_45m` | $180\,\mu\text{g/m}^3$ (1-h eq) | Assumption (heavy roadside traffic spike for 45 min) |
| Exposure hit: `closed_kitchen_smoke` | $120\,\mu\text{g/m}^3$ (1-h eq) | Assumption (30 min closed-kitchen *tadka* or incense spike) |
| Exposure hit: `outdoor_errand_1h` | $90\,\mu\text{g/m}^3$ (1-h eq) | Assumption (1-h outdoor errand spike during peak hour) |
| Room hazard: `indoor_smoke_source` | $1200\,\mu\text{g/h}$ (19:00 & 21:00) | Assumption (evening indoor smoke/incense emission tier) |

## 8.11 Dynamic schedule sync, recovery & budget frontier
- **Dynamic commute & airing hours (`src/engine/routine.ts`):** When `customAiringHour` ($6\text{–}22$) is supplied, baseline airing shifts from `07:00` to `customAiringHour` (Smart Timing still moves airing to `bestHour`). When `customCommuteHour` ($5\text{–}22$) is supplied: if $\le 13$, commute hours are `[customCommuteHour, min(22, customCommuteHour + 9)]`; if $> 13$, commute hours are `[9, customCommuteHour]`; if omitted, default `[9, 18]`.
- **Mid-day exposure debt & recovery (`src/engine/recovery.ts`):** Takes explicit `currentHour` ($0\text{–}23$, never `new Date()`), injects the active exposure-hit spike(s) into the 24-h exposure curve, and computes `debtUgM3`, `budgetUsedPct` (relative to WHO $15\,\mu\text{g/m}^3$), and `recoverableUgM3` under Recovery Mode (`smartTiming: true` and `seal_exhaust` if `indoor === 'none'`).
- **Budget frontier (`src/engine/budgetFrontier.ts`):** Evaluates 4 tiers (`free_0`, `under_500`, `diy_2500`, `hepa_12000`) against the unmitigated baseline (`smartTiming: false, indoor: 'none'`) and reports `shareOfMaxBenefitPct` relative to `hepa_12000`.

**Official CPCB $\text{PM}_{2.5}$ 24-hr category bands** (always render text + icon + number, never color alone):
`0–30` Good | `31–60` Satisfactory | `61–90` Moderately Polluted | `91–120` Poor | `121–250` Very Poor | `250+` Severe.

## 8.10 Fingerprint heuristic (label as heuristic)
- $\text{PM}_{2.5}/\text{PM}_{10} \ge 0.6 \to$ `combustion`; $0.4\text{–}0.6 \to$ `mixed`; $<0.4 \to$ `dust`; missing $\to$ `unknown`.
- $\text{NO}_2$: $<25$ `low`, $25\text{–}80$ `moderate`, $>80$ `high` ($\mu\text{g/m}^3$, aligned with CPCB 24-hr standard of $80\,\mu\text{g/m}^3$).
- Note in methodology that CAMS global modeled ratios (~45 km grid outside Europe) are indicative, not street-level measurements.
