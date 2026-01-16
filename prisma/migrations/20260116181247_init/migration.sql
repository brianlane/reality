-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAYMENT_PENDING', 'SCREENING_IN_PROGRESS', 'APPROVED', 'REJECTED', 'WAITLIST');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('APPLICATION_FEE', 'EVENT_FEE', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'INVITATIONS_SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('CURATED', 'MUTUAL_SPEED', 'SOCIAL_HOUR');

-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('PENDING', 'FIRST_DATE_SCHEDULED', 'FIRST_DATE_COMPLETED', 'SECOND_DATE', 'DATING', 'RELATIONSHIP', 'ENGAGED', 'MARRIED', 'NO_CONNECTION', 'GHOSTED');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('APPROVE_APPLICATION', 'REJECT_APPLICATION', 'CREATE_EVENT', 'SEND_INVITATIONS', 'RECORD_MATCH', 'UPDATE_MATCH_OUTCOME', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "location" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "employer" TEXT,
    "education" TEXT NOT NULL,
    "incomeRange" TEXT NOT NULL,
    "incomeVerified" BOOLEAN NOT NULL DEFAULT false,
    "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "screeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "idenfyStatus" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "idenfyVerificationId" TEXT,
    "checkrStatus" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "checkrReportId" TEXT,
    "backgroundCheckNotes" TEXT,
    "compatibilityScore" DOUBLE PRECISION,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "religionImportance" INTEGER NOT NULL,
    "politicalAlignment" TEXT NOT NULL,
    "familyImportance" INTEGER NOT NULL,
    "careerAmbition" INTEGER NOT NULL,
    "financialGoals" TEXT NOT NULL,
    "fitnessLevel" TEXT NOT NULL,
    "diet" TEXT NOT NULL,
    "drinking" TEXT NOT NULL,
    "smoking" TEXT NOT NULL,
    "drugs" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "relationshipGoal" TEXT NOT NULL,
    "wantsChildren" TEXT NOT NULL,
    "childrenTimeline" TEXT,
    "movingWillingness" TEXT NOT NULL,
    "hobbies" TEXT[],
    "travelFrequency" TEXT NOT NULL,
    "favoriteActivities" TEXT[],
    "loveLanguage" TEXT NOT NULL,
    "conflictStyle" TEXT NOT NULL,
    "introvertExtrovert" INTEGER NOT NULL,
    "spontaneityPlanning" INTEGER NOT NULL,
    "dealBreakers" TEXT[],
    "aboutMe" TEXT NOT NULL,
    "idealPartner" TEXT NOT NULL,
    "perfectDate" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "venueAddress" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "venueCost" INTEGER NOT NULL,
    "cateringCost" INTEGER NOT NULL,
    "materialsCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "expectedRevenue" INTEGER NOT NULL,
    "actualRevenue" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "blindNotes" TEXT,
    "faceToFaceNotes" TEXT,
    "interestedIn" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "MatchType" NOT NULL,
    "compatibilityScore" DOUBLE PRECISION,
    "outcome" "MatchOutcome" NOT NULL DEFAULT 'PENDING',
    "contactExchanged" BOOLEAN NOT NULL DEFAULT false,
    "contactExchangedAt" TIMESTAMP(3),
    "day30FollowUp" JSONB,
    "day90FollowUp" JSONB,
    "month6FollowUp" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AdminActionType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_userId_key" ON "Applicant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_idenfyVerificationId_key" ON "Applicant"("idenfyVerificationId");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_checkrReportId_key" ON "Applicant"("checkrReportId");

-- CreateIndex
CREATE INDEX "Applicant_applicationStatus_idx" ON "Applicant"("applicationStatus");

-- CreateIndex
CREATE INDEX "Applicant_gender_idx" ON "Applicant"("gender");

-- CreateIndex
CREATE INDEX "Applicant_screeningStatus_idx" ON "Applicant"("screeningStatus");

-- CreateIndex
CREATE INDEX "Applicant_compatibilityScore_idx" ON "Applicant"("compatibilityScore");

-- CreateIndex
CREATE UNIQUE INDEX "Questionnaire_applicantId_key" ON "Questionnaire"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_applicantId_idx" ON "Payment"("applicantId");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_stripePaymentId_idx" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");

-- CreateIndex
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");

-- CreateIndex
CREATE INDEX "EventInvitation_applicantId_idx" ON "EventInvitation"("applicantId");

-- CreateIndex
CREATE INDEX "EventInvitation_status_idx" ON "EventInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_eventId_applicantId_key" ON "EventInvitation"("eventId", "applicantId");

-- CreateIndex
CREATE INDEX "Match_eventId_idx" ON "Match"("eventId");

-- CreateIndex
CREATE INDEX "Match_applicantId_idx" ON "Match"("applicantId");

-- CreateIndex
CREATE INDEX "Match_partnerId_idx" ON "Match"("partnerId");

-- CreateIndex
CREATE INDEX "Match_outcome_idx" ON "Match"("outcome");

-- CreateIndex
CREATE INDEX "Match_type_idx" ON "Match"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Match_eventId_applicantId_partnerId_key" ON "Match"("eventId", "applicantId", "partnerId");

-- CreateIndex
CREATE INDEX "AdminAction_userId_idx" ON "AdminAction"("userId");

-- CreateIndex
CREATE INDEX "AdminAction_type_idx" ON "AdminAction"("type");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_targetId_idx" ON "AdminAction"("targetId");

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
