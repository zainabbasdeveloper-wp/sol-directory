import { REGISTER_SUPPORT_CATEGORIES, type SupportCategory } from './registerNormalise.js';

/**
 * Turns a service name (a wizard value, or the service page a visitor was on) into one of the register's canonical
 * support categories, or undefined when there is no honest match. Mirrors CATEGORY_ALIASES in apps/web/src/lib/registerMeta.ts;
 * the order matters (first match wins), so keep the two lists in step.
 */
const ALIASES: [RegExp, SupportCategory][] = [
  [/interpret|translat/i, 'Interpreting & translation'],
  [/plan management/i, 'Plan management'],
  [/support coordination|support connection|psychosocial recovery/i, 'Support coordination'],
  [/respite|short term accommodation|\bsta\b/i, 'Respite care'],
  [/behaviour/i, 'Behaviour support'],
  [/life skills|daily living|self-management|financial and organisational|study and learning|life transition|skill-building camps|group skills|tenancy skills/i, 'Life skills'],
  [/\b(sda|sil|ilo|mta)\b|accommodation|housing|shared living|individualised living|tenancy/i, 'Housing (SDA & SIL)'],
  [/home modification/i, 'Home modifications'],
  [/transport/i, 'Transport'],
  [/nurs|continence|enteral|medication/i, 'Nursing'],
  [/assistive|equipment|prosthetic|orthotic/i, 'Assistive technology & equipment'],
  [/allied health|therap|physio|occupational|speech|psycholog|counsell|dietitian|podiatry|audiolog|hearing services|exercise|early childhood|social work|orientation/i, 'Therapy services'],
  [/employment|job coaching|higher education|further education|study/i, 'Employment & education support'],
  [/personal care|high-intensity|overnight/i, 'Personal care'],
  [/domestic|cleaning|household|meal preparation|yard|gardening/i, 'Domestic assistance'],
  [/community|social|activities|participation|volunteer|camps|holidays|recreation|cultural/i, 'Community access'],
  [/dementia/i, 'Dementia care'],
  [/palliative/i, 'Palliative care'],
  [/residential aged care/i, 'Residential aged care'],
];

export function categoryForNeed(...names: (string | undefined | null)[]): SupportCategory | undefined {
  for (const raw of names) {
    const name = (raw ?? '').trim();
    if (!name || /^not sure yet$/i.test(name)) continue;
    const exact = REGISTER_SUPPORT_CATEGORIES.find((c) => c.toLowerCase() === name.toLowerCase());
    if (exact) return exact;
    const alias = ALIASES.find(([re]) => re.test(name))?.[1];
    if (alias) return alias;
  }
  return undefined;
}
