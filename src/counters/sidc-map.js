/**
 * Mapping from musterwright spine unit class/type values to MIL-STD-2525/APP-6
 * letter-based SIDC strings for milsymbol rendering.
 *
 * Uses the APP-6D Warfighting symbol set with Unknown affiliation:
 *   S = coding scheme (Warfighting)
 *   U = affiliation (Unknown/Pending — neutral)
 *   G = battle dimension (Ground)
 *   - = status (Present)
 *   ?????? = function ID (6 chars, e.g. "UCI---" for infantry)
 *   -- = modifiers (none)
 *
 * The faction color on the counter body carries affiliation, so the SIDC
 * uses Unknown and milsymbol renders with frame:false.
 */

const PREFIX = 'SUG-';
const SUFFIX = '--';

const SIDC_MAP = {
  // GotA (Guns of the Americas) types — extracted from real source data
  /** Field Artillery (tube artillery) */
  art:            PREFIX + 'UCF---' + SUFFIX,
  /** Cavalry / mounted reconnaissance */
  cav:            PREFIX + 'UCRV--' + SUFFIX,
  /** Heavy artillery */
  'h-art':        PREFIX + 'UCFHH-' + SUFFIX,
  /** Heavy artillery (source-data typo preserved) */
  'heavy artiilery': PREFIX + 'UCFHH-' + SUFFIX,
  /** Infantry (also covers marine infantry) */
  inf:            PREFIX + 'UCI---' + SUFFIX,
  /** Marine infantry (amphibious) */
  'mx marine/inf': PREFIX + 'UCI---' + SUFFIX,

  // Common additional types for future-proofing
  /** Headquarters / command element */
  hq:             PREFIX + 'UH1---' + SUFFIX,
  /** Armour / armored (US spelling) */
  armor:          PREFIX + 'UCA---' + SUFFIX,
  /** Armour / armoured (British spelling) */
  armour:         PREFIX + 'UCA---' + SUFFIX,
  /** Combat Engineer */
  eng:            PREFIX + 'UCE---' + SUFFIX,
  /** Engineer */
  engineer:       PREFIX + 'UCE---' + SUFFIX,
  /** Reconnaissance (not cavalry) */
  recon:          PREFIX + 'UCR---' + SUFFIX,
  /** Motorized infantry */
  motor:          PREFIX + 'UCIM--' + SUFFIX,
  /** Mechanized infantry */
  mech:           PREFIX + 'UCIM--' + SUFFIX,
  /** Mountain infantry */
  mountain:       PREFIX + 'UCIO--' + SUFFIX,
  /** Marine Corps (amphibious) */
  marine:         PREFIX + 'UCI---' + SUFFIX,
};

/** SIDC that produces an empty icon (no unit-type symbol) for unknown types. */
const FALLBACK_SIDC = PREFIX + 'U-----' + SUFFIX;

/**
 * Look up a SIDC for a unit class value.
 * Returns the SIDC string or null if not found.
 */
export function getSidc(unitClass) {
  const normalized = String(unitClass ?? '').trim().toLowerCase();
  return SIDC_MAP[normalized] || null;
}

/**
 * Like getSidc but returns the fallback SIDC (plain frame, no icon)
 * instead of null when the type is unknown.
 */
export function resolveSidc(unitClass) {
  return getSidc(unitClass) || FALLBACK_SIDC;
}

export { SIDC_MAP, FALLBACK_SIDC };
