-- Seed Data for Policies Table
-- Run this in the Supabase SQL Editor to populate your "Brain" with starter rules.

insert into policies (payer, cpt_code, title, policy_content, source_url)
values
(
  'Aetna',
  '73721',
  'MRI of Knee (Commercial)',
  '- MENISCAL TEAR: Must have functional limitations AND failure of 6 weeks NSAIDs/PT.
- LIGAMENT TEAR: Positive physical exam findings (Lachman/McMurray) required.
- OSTEOARTHRITIS: MRI not indicated if X-ray shows severe degeneration (Grade 4).',
  'https://www.aetna.com/cpb/medical/data/1_99/0002.html'
),
(
  'Cigna',
  '27447',
  'Total Knee Arthroplasty',
  '- BMI Requirement: Must be < 40.
- Conservative Therapy: 3 months of failed non-operative management (injections, PT, bracing).
- Radiographic Evidence: Kellgren-Lawrence Grade 3 or 4 required.
- Pain: Daily pain impacting ADLs provided.',
  'https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0055_coveragepositioncriteria_total_knee_replacement.pdf'
),
(
  'UnitedHealthcare',
  '93015',
  'Cardiovascular Stress Testing',
  '- SYMPTOMATIC: Chest pain or dyspnea on exertion.
- ASYMPTOMATIC: High global risk score (>20% 10-year risk).
- Pre-Operative: Only for High-Risk surgery with poor functional capacity (<4 METs).',
  'https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/cardiovascular-stress-testing.pdf'
);
