-- Add applicant seeking field
ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "seeking" "Gender";
