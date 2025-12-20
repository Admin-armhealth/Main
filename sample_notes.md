# Sample Clinical Notes for Testing

Use these notes to test the Pre-Authorization flow. They contain realistic "messy" data, PHI to be redacted, and medical criteria.

## Scenario 1: Lumbar MRI (Back Pain)
**Payer:** Aetna
**Patient:** Michael Scott
**Condition:** L4-L5 Disc Herniation
**Goal:** Test "failed conservative therapy" logic.

```text
PATIENT: Michael Scott
DOB: 03/15/1964
ID: AET-99887766
DATE: 12/12/2024

S: Pt presents with worsening lower back pain radiating to left leg (L4-distribution). Pain is 7/10. Started 3 months ago after lifting heavy boxes. Numbness in big toe. 
Pt has tried Ibuprofen 800mg TID and Tylenol for 12 weeks with minimal relief.
Pt completed 8 weeks of PT at Scranton Physical Therapy (Dates: 9/1/24 - 11/1/24) without improvement.
Home exercises not helping.

O: Reduced ROM in flexion. 
Straight Leg Raise (SLR) positive on Left at 45 degrees.
Strength: 4/5 L4 extension.
Reflexes: Patellar 1+ Left.

A: Lumbar Radiculopathy, r/o HNP L4-L5.
Failed conservative care (>6 weeks).

P: Request MRI Lumbar Spine w/o contrast to evaluate for surgical intervention.
Plan for follow-up after imaging.
Dr. Beesly, MD
NPI: 1234567890
```

---

## Scenario 2: Knee Arthroscopy (Surgery)
**Payer:** Cigna
**Patient:** Dwight Schrute
**Condition:** Meniscal Tear
**Goal:** Test "mechanical symptoms" extraction.

```text
OFFICE VISIT NOTE
Patient: Dwight K. Schrute (DOB 01/20/1970)
Member ID: CIG-555-444
Provider: Dr. Halpert, Ortho
Clinic: Dunder Mifflin Health

History:
54yo male complaining of right knee locking and catching. Injury occurred while farming beets 4 months ago.
States knee "gives way" walking on uneven ground.
Tried Cortisone injection (10/15/2024) - relief lasted 2 days.
NSAIDs no help.
Physical Therapy done for 6 weeks, checking the box, but symptoms persist.
MRI done 11/01/2024 shows complex tear of medial meniscus, posterior horn.

Physical Exam:
Right Knee: Mild effusion. Tenderness medial joint line.
McMurray's test positives for click and pain.
Range of motion full but painful at end flexion.
Stable to varus/valgus.

Impression:
Right Medial Meniscus Tear (M23.221)
Failed conservative tx.
Mechanical symptoms (Locking/Catching) present.

Plan:
Proceed with Right Knee Arthroscopy with meniscectomy (CPT 29881).
Risks/benefits discussed.
```

---

## Scenario 3: Physical Therapy (Continuation)
**Payer:** UHC (UnitedHealthcare)
**Patient:** Stanley Hudson
**Condition:** Rotator Cuff Repair (Post-Op)
**Goal:** Verify correct identifying of "Post-Op" status.

```text
PROGRESS NOTE - PT
Name: Stanley Hudson
DOB: 02/19/1958
UHC ID: 888222111

Subjective:
Patient is 4 weeks s/p Right Rotator Cuff Repair (Supraspinatus).
Pain is 4/10. improving.
Has trouble sleeping on right side.
Complains of stiffness.

Objective:
Incision: Well healed.
PROM: Flexion 120 (improved from 90), Abd 90.
AAROM: Started pulleys.
Strength: Not tested per protocol.

Assessment:
Patient progressing well but strictly limits overhead activity.
Deficits in ROM and strength functional limits ADLs (dressing, reaching).
Needs continued skilled PT to prevent frozen shoulder and restore function.

Plan:
Requesting authorization for 12 additional visits (97110, 97140).
Focus on PROM -> AAROM -> Strengthening.
Estimated duration: 6 weeks.
```
