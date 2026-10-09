/**
 * Plain geography for the /locations page: each state or territory's capital and its larger regional centres.
 * These are place names only (no claims about providers); counts and provider links come from live data.
 */
export interface StateInfo {
  code: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  capital: string;
  centres: string[];
}

export const STATE_INFO: StateInfo[] = [
  { code: 'NSW', capital: 'Sydney', centres: ['Newcastle', 'Wollongong', 'Central Coast', 'Parramatta', 'Wagga Wagga', 'Albury', 'Orange', 'Dubbo', 'Tamworth', 'Coffs Harbour', 'Port Macquarie'] },
  { code: 'VIC', capital: 'Melbourne', centres: ['Geelong', 'Ballarat', 'Bendigo', 'Dandenong', 'Shepparton', 'Wodonga', 'Mildura', 'Warrnambool', 'Traralgon'] },
  { code: 'QLD', capital: 'Brisbane', centres: ['Gold Coast', 'Sunshine Coast', 'Ipswich', 'Townsville', 'Cairns', 'Toowoomba', 'Rockhampton', 'Mackay', 'Bundaberg'] },
  { code: 'WA', capital: 'Perth', centres: ['Mandurah', 'Bunbury', 'Geraldton', 'Kalgoorlie', 'Albany', 'Broome', 'Karratha'] },
  { code: 'SA', capital: 'Adelaide', centres: ['Mount Gambier', 'Whyalla', 'Murray Bridge', 'Port Augusta', 'Port Lincoln'] },
  { code: 'TAS', capital: 'Hobart', centres: ['Launceston', 'Devonport', 'Burnie'] },
  { code: 'ACT', capital: 'Canberra', centres: ['Belconnen', 'Tuggeranong', 'Gungahlin', 'Woden'] },
  { code: 'NT', capital: 'Darwin', centres: ['Palmerston', 'Alice Springs', 'Katherine', 'Tennant Creek'] },
];

export interface LocationFaq { q: string; a: string }

/** General, durable answers. Anything that can change (rules, prices) points the reader to the official source instead of stating a figure. */
export const LOCATION_FAQS: LocationFaq[] = [
  {
    q: 'How do I find an NDIS provider near me?',
    a: 'Start with the suburb where the support will actually happen. Search it here, then widen to the nearest city or state if you need more options. Each result shows what the provider says it offers and where it works; contact two or three and compare how they respond.',
  },
  {
    q: 'What is the difference between a SolDirectory profile and a register listing?',
    a: 'A profile is created and maintained by the provider itself, so it can say more about its services, areas and how to make an enquiry. A register listing comes from the public NDIS Commission or My Aged Care registers and shows only what those registers publish. Both are shown so you can see a wider picture, but a register listing does not tell you who has capacity right now.',
  },
  {
    q: 'Can I choose a provider in a different suburb or state?',
    a: 'Yes. You are not limited to the suburb you live in. What matters is whether the provider can deliver support where you need it, so ask about their service area, travel costs and minimum shift lengths before you agree to anything.',
  },
  {
    q: 'Do providers charge extra to travel to me?',
    a: 'Some do, and rules differ by support type. The NDIS Pricing Arrangements set limits that can include provider travel and may allow higher prices in remote and very remote areas. Always check the current pricing arrangements on the NDIS website and ask the provider to put any travel charges in writing.',
  },
  {
    q: 'What if I live in a regional, rural or remote area?',
    a: 'Fewer providers may be based near you, but many travel or deliver some supports, such as planning, support coordination and some therapy, by phone or video. Search your nearest regional centre as well as your own town, and ask providers how often they visit.',
  },
  {
    q: 'Are the register listings checked by SolDirectory?',
    a: 'Register listings reflect the public registers as imported, and they can go out of date. Before you commit, confirm a provider’s current status on the official register (links are on each state page) and ask for a service agreement that spells out price, hours and cancellation terms.',
  },
  {
    q: 'Is it free to use SolDirectory?',
    a: 'Searching is free, and so is submitting a request for matched providers. We do not charge participants or families to search or to send an enquiry.',
  },
];
