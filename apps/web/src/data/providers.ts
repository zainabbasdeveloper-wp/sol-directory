// Static lists for the public site. The hardcoded sample providers that used
// to live here (with invented names and NDIS registration numbers) have been
// removed: every provider shown on the site now comes from the database.

export const SERVICES = ['All services', 'Support coordination', 'Personal care', 'Domestic assistance', 'Therapy services', 'Transport', 'Housing (SDA & SIL)', 'Nursing', 'Plan management'];

export interface LocationGroup {
  state: string;
  /** State abbreviations this group covers — used to sum REAL provider counts (stats.providersByState). */
  states: string[];
  places: string[];
}

// Groups of states/regions. Provider counts shown next to them come from live data.
// shown in the live Claude Design preview.
export const LOCATION_GROUPS: LocationGroup[] = [
  { state: 'New South Wales', states: ['NSW'], places: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta'] },
  { state: 'Victoria', states: ['VIC'], places: ['Melbourne', 'Geelong', 'Ballarat', 'Dandenong'] },
  { state: 'Queensland', states: ['QLD'], places: ['Brisbane', 'Gold Coast', 'Townsville', 'Cairns'] },
  { state: 'Rest of Australia', states: ['SA', 'WA', 'TAS', 'NT', 'ACT'], places: ['Perth', 'Adelaide', 'Hobart', 'Canberra', 'Darwin'] },
];
