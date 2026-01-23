export const MOCK_APPLICATION_ID = "preview-mock-id";

export const mockBasicInfo = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex.johnson@example.com",
  phone: "(555) 123-4567",
  age: 28,
  gender: "FEMALE" as const,
  location: "San Francisco, CA",
  instagram: "@alexjohnson",
};

export const mockDemographics = {
  ...mockBasicInfo,
  cityFrom: "Austin, TX",
  industry: "Technology",
  occupation: "Software Engineer",
  employer: "Tech Corp",
  education: "Bachelor's Degree",
  incomeRange: "100k-200k",
  referredBy: "Jordan Lee",
  aboutYourself:
    "Passionate about technology and outdoor activities. I love hiking, reading science fiction, and building community connections. Looking forward to being part of this journey.",
  seeking: "MALE",
  height: "5'6\"",
  bodyType: "Athletic",
  ethnicity: "Asian",
  religion: "Agnostic",
  politicalViews: "Moderate",
  relationshipStatus: "Single",
  hasChildren: false,
  wantsChildren: "Open to it",
  drinkingHabits: "Socially",
  smokingHabits: "Non-smoker",
  exerciseFrequency: "3-4 times per week",
};

export const mockPhotos = [
  "/placeholder-photo-1.jpg",
  "/placeholder-photo-2.jpg",
  "/placeholder-photo-3.jpg",
];

// Mock questionnaire answers for all question types
export const mockQuestionnaireAnswers: Record<
  string,
  { value: unknown; richText?: string }
> = {
  text_answer: { value: "Sample text response" },
  textarea_answer: {
    value:
      "This is a longer form response that demonstrates how textarea answers would appear in the questionnaire. It can contain multiple sentences and paragraphs.",
  },
  rich_text_answer: {
    value: "<p>Rich text with <strong>formatting</strong></p>",
    richText: "<p>Rich text with <strong>formatting</strong></p>",
  },
  dropdown_answer: { value: "Option 2" },
  radio_7_answer: { value: "Option 4" },
  checkboxes_answer: { value: ["Option 1", "Option 3"] },
  number_scale_answer: { value: 7 },
};

export const mockInviteToken = "preview-invite-token-123";

export const mockPaymentInfo = {
  amount: 500,
  currency: "USD",
  status: "pending" as const,
  description: "Application processing fee",
};
