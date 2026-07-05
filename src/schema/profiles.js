/**
 * Per-game schema profiles.  The spine stays agnostic; each adapter supplies
 * a profile describing the fields it expects so the validator can flag
 * missing / extra / mis-typed values without the spine knowing game shape.
 */

export const GOTA_PROFILE = {
  id: 'gota',
  name: 'Guns of the Americas',
  unitNoteKey(faction) {
    return `_note_${faction}`;
  },
  rosterUnitFields: {
    required: ['id', 'faction', 'sp', 'dv', 'mp', 'type', 'size'],
    optional: ['fresh'],
    numeric: ['sp', 'dv', 'mp'],
    factorKeys: ['sp', 'dv', 'mp'],
    text: ['id', 'faction', 'type', 'size']
  },
  assetUnitFields: {
    required: ['id', 'faction', 'av', 'dv', 'mp', 'type', 'size'],
    optional: ['fresh'],
    numeric: ['av', 'dv', 'mp'],
    factorKeys: ['av', 'dv', 'mp'],
    text: ['id', 'faction', 'type', 'size']
  },
  poolFields: {
    required: ['sp_count', 'av_per_sp'],
    optional: ['notes'],
    numeric: ['sp_count', 'av_per_sp'],
    text: ['notes']
  }
};

export const PROFILES = new Map([
  ['gota', GOTA_PROFILE]
]);

export function getProfile(id) {
  return PROFILES.get(id) || null;
}
