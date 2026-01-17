type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
};

export async function sendEmail(params: SendEmailParams) {
  return {
    id: `email_mock_${Date.now()}`,
    ...params,
  };
}
