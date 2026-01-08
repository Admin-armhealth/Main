-- Seed Data for Policies Table - REAL URLs for Sync Engine
-- Note: 'policy_content' is left null/placeholder so the Sync Engine detects it needs to fetch.

truncate table policies cascade; 

insert into policies (payer, cpt_code, title, source_url)
values
-- ==========================================
-- AETNA
-- ==========================================
(
  'Aetna',
  '72148',
  'MRI of the Spine (Lumbar)',
  'https://www.aetna.com/cpb/medical/data/200_299/0236.html'
),
(
  'Aetna',
  '66984',
  'Cataract Surgery',
  'https://www.aetna.com/cpb/medical/data/500_599/0508.html'
),
(
  'Aetna',
  '27130',
  'Total Hip Arthroplasty',
  'https://www.aetna.com/cpb/medical/data/200_299/0287.html'
),
(
  'Aetna',
  '97110',
  'Physical Therapy Services',
  'https://www.aetna.com/cpb/medical/data/300_399/0325.html'
),
(
  'Aetna',
  'J1347',
  'Wegovy (Weight Management)',
  'https://www.aetna.com/cpb/medical/data/new/0002.html' 
  -- Note: Placeholder URL for Wegovy as it varies by plan, using generic CPB structure
),

-- ==========================================
-- CIGNA
-- ==========================================
(
  'Cigna',
  '27447',
  'Total Knee Arthroplasty',
  'https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0055_coveragepositioncriteria_total_knee_replacement.pdf'
),
(
  'Cigna',
  '43644',
  'Bariatric Surgery',
  'https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0051_coveragepositioncriteria_bariatric_surgery.pdf'
),
(
  'Cigna',
  '81220',
  'Genetic Testing (General)',
  'https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0001_coveragepositioncriteria_genetic_testing.pdf'
),

-- ==========================================
-- UNITED HEALTHCARE (UHC)
-- ==========================================
(
  'UnitedHealthcare',
  '93015',
  'Cardiovascular Stress Testing',
  'https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/cardiovascular-stress-testing.pdf'
),
(
  'UnitedHealthcare',
  'E0601',
  'CPAP for Sleep Apnea',
  'https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/obstructive-sleep-apnea-treatment.pdf'
),
(
  'UnitedHealthcare',
  '22849',
  'Spinal Fusion and Decompression',
  'https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/spinal-fusion-decompression.pdf'
)

on conflict (payer, cpt_code, organization_id) 
do update set source_url = excluded.source_url;
