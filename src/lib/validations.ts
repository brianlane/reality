import { z } from "zod";

export const stage1QualificationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  age: z.number().int().min(18, "Must be 18 or older").max(100),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  location: z.string().min(1, "Location is required"),
  aboutYourself: z
    .string()
    .min(50, "Please write at least 50 characters")
    .max(500, "Please keep it under 500 characters"),
});

export const demographicsSchema = z.object({
  age: z.number().int().min(18).max(100),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  location: z.string().min(1),
  occupation: z.string().min(1),
  employer: z.string().optional().nullable(),
  education: z.string().min(1),
  incomeRange: z.string().min(1),
});

export const questionnaireSchema = z
  .object({
    religionImportance: z.number().int().min(1).max(5),
    politicalAlignment: z.string().min(1),
    familyImportance: z.number().int().min(1).max(5),
    careerAmbition: z.number().int().min(1).max(5),
    financialGoals: z.string().min(1),
    fitnessLevel: z.string().min(1),
    diet: z.string().min(1),
    drinking: z.string().min(1),
    smoking: z.string().min(1),
    drugs: z.string().min(1),
    pets: z.string().min(1),
    relationshipGoal: z.string().min(1),
    wantsChildren: z.string().min(1),
    childrenTimeline: z.string().optional().nullable(),
    movingWillingness: z.string().min(1),
    hobbies: z.array(z.string()).default([]),
    travelFrequency: z.string().min(1),
    favoriteActivities: z.array(z.string()).default([]),
    loveLanguage: z.string().min(1),
    conflictStyle: z.string().min(1),
    introvertExtrovert: z.number().int().min(1).max(10),
    spontaneityPlanning: z.number().int().min(1).max(10),
    dealBreakers: z.array(z.string()).default([]),
    aboutMe: z.string().min(1),
    idealPartner: z.string().min(1),
    perfectDate: z.string().min(1),
    responses: z.record(z.string(), z.any()).default({}),
  })
  .partial()
  .default({});

export const createApplicationSchema = z.object({
  applicant: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
  }),
  applicationId: z.string().min(1).optional(),
  inviteToken: z.string().optional(), // For waitlist validation
  demographics: demographicsSchema,
  questionnaire: questionnaireSchema.optional(),
});

export const submitApplicationSchema = z.object({
  applicationId: z.string().min(1),
});

export const updateMatchSchema = z.object({
  outcome: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const inviteApplicantsSchema = z.object({
  applicantIds: z.array(z.string().min(1)).min(1),
});

export const createMatchesSchema = z.object({
  matches: z
    .array(
      z.object({
        applicantId: z.string().min(1),
        partnerId: z.string().min(1),
        compatibilityScore: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
});
