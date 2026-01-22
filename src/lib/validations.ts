import { z } from "zod";

// Strict email regex that requires proper domain with TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const stage1QualificationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(EMAIL_REGEX, "Please enter a valid email address"),
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
    email: z
      .string()
      .min(1)
      .regex(EMAIL_REGEX, "Please enter a valid email address"),
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

export const adminUserCreateSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().min(1).regex(EMAIL_REGEX, "Please enter a valid email"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["APPLICANT", "ADMIN"]),
});

export const adminUserUpdateSchema = adminUserCreateSchema
  .partial()
  .extend({ deletedAt: z.string().datetime().optional().nullable() });

export const adminApplicantCreateSchema = z.object({
  user: adminUserCreateSchema,
  applicant: z.object({
    age: z.number().int().min(18).max(100),
    gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
    location: z.string().min(1),
    occupation: z.string().min(1),
    employer: z.string().optional().nullable(),
    education: z.string().min(1),
    incomeRange: z.string().min(1),
    applicationStatus: z.enum([
      "DRAFT",
      "SUBMITTED",
      "PAYMENT_PENDING",
      "SCREENING_IN_PROGRESS",
      "APPROVED",
      "REJECTED",
      "WAITLIST",
      "WAITLIST_INVITED",
    ]),
    screeningStatus: z.enum(["PENDING", "IN_PROGRESS", "PASSED", "FAILED"]),
    photos: z.array(z.string()).default([]),
  }),
});

export const adminApplicantUpdateSchema = z.object({
  applicant: z
    .object({
      age: z.number().int().min(18).max(100).optional(),
      gender: z
        .enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"])
        .optional(),
      location: z.string().min(1).optional(),
      occupation: z.string().min(1).optional(),
      employer: z.string().optional().nullable(),
      education: z.string().min(1).optional(),
      incomeRange: z.string().min(1).optional(),
      applicationStatus: z
        .enum([
          "DRAFT",
          "SUBMITTED",
          "PAYMENT_PENDING",
          "SCREENING_IN_PROGRESS",
          "APPROVED",
          "REJECTED",
          "WAITLIST",
          "WAITLIST_INVITED",
        ])
        .optional(),
      screeningStatus: z
        .enum(["PENDING", "IN_PROGRESS", "PASSED", "FAILED"])
        .optional(),
      backgroundCheckNotes: z.string().optional().nullable(),
      compatibilityScore: z.number().min(0).max(100).optional().nullable(),
      photos: z.array(z.string()).optional(),
    })
    .partial(),
});

export const adminEventCreateSchema = z.object({
  name: z.string().min(1),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  venue: z.string().min(1),
  venueAddress: z.string().min(1),
  capacity: z.number().int().min(1),
  costs: z.object({
    venue: z.number().int().min(0),
    catering: z.number().int().min(0),
    materials: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  expectedRevenue: z.number().int().min(0),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "INVITATIONS_SENT", "CONFIRMED", "COMPLETED", "CANCELLED"])
    .optional(),
});

export const adminEventUpdateSchema = adminEventCreateSchema.partial().extend({
  status: z
    .enum(["DRAFT", "INVITATIONS_SENT", "CONFIRMED", "COMPLETED", "CANCELLED"])
    .optional(),
});

export const adminMatchCreateSchema = z.object({
  eventId: z.string().min(1),
  applicantId: z.string().min(1),
  partnerId: z.string().min(1),
  type: z.enum(["CURATED", "MUTUAL_SPEED", "SOCIAL_HOUR"]),
  compatibilityScore: z.number().min(0).max(100).optional(),
});

export const adminMatchUpdateSchema = z.object({
  outcome: z
    .enum([
      "PENDING",
      "FIRST_DATE_SCHEDULED",
      "FIRST_DATE_COMPLETED",
      "SECOND_DATE",
      "DATING",
      "RELATIONSHIP",
      "ENGAGED",
      "MARRIED",
      "NO_CONNECTION",
      "GHOSTED",
    ])
    .optional(),
  notes: z.string().optional().nullable(),
  contactExchanged: z.boolean().optional(),
  compatibilityScore: z.number().min(0).max(100).optional().nullable(),
});

export const adminPaymentCreateSchema = z.object({
  applicantId: z.string().min(1),
  eventId: z.string().optional().nullable(),
  type: z.enum(["APPLICATION_FEE", "EVENT_FEE", "MEMBERSHIP"]),
  amount: z.number().int().min(0),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]),
  stripePaymentId: z.string().optional().nullable(),
  stripeInvoiceId: z.string().optional().nullable(),
});

export const adminPaymentUpdateSchema = adminPaymentCreateSchema.partial();

export const adminWaitlistUpdateSchema = z.object({
  waitlistReason: z.string().optional().nullable(),
  waitlistPosition: z.number().int().min(1).optional().nullable(),
});

export const adminQuestionnairePageCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const adminQuestionnairePageUpdateSchema =
  adminQuestionnairePageCreateSchema.partial();

export const adminQuestionnaireSectionCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  pageId: z.string().min(1),
});

export const adminQuestionnaireSectionUpdateSchema =
  adminQuestionnaireSectionCreateSchema.partial();

export const questionnaireQuestionTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "RICH_TEXT",
  "DROPDOWN",
  "RADIO_7",
  "CHECKBOXES",
  "NUMBER_SCALE",
]);

export const adminQuestionnaireQuestionCreateSchema = z
  .object({
    sectionId: z.string().min(1),
    prompt: z.string().min(1),
    helperText: z.string().optional().nullable(),
    type: questionnaireQuestionTypeSchema,
    options: z.any().optional().nullable(),
    isRequired: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "RADIO_7" && Array.isArray(data.options)) {
      const options = data.options.filter((item) => String(item).trim());
      if (options.length !== 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Radio 7 questions must have exactly 7 options.",
          path: ["options"],
        });
      }
    }
  });

export const adminQuestionnaireQuestionUpdateSchema = z
  .object({
    sectionId: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
    helperText: z.string().optional().nullable(),
    type: questionnaireQuestionTypeSchema.optional(),
    options: z.any().optional().nullable(),
    isRequired: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "RADIO_7" && Array.isArray(data.options)) {
      const options = data.options.filter((item) => String(item).trim());
      if (options.length !== 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Radio 7 questions must have exactly 7 options.",
          path: ["options"],
        });
      }
    }
  });

export const applicantQuestionnaireSubmitSchema = z.object({
  applicationId: z.string().min(1),
  pageId: z.string().min(1).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.any().optional().nullable(),
        richText: z.string().optional().nullable(),
      }),
    )
    .min(1),
});
