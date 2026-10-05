// Server-only email helper using Resend.
// Sign up at https://resend.com to get a free API key (100 emails/day on free tier).
// Set RESEND_API_KEY in your .env file.

import { Resend } from "resend";

let _client: Resend | undefined;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

type InviteEmailParams = {
  to: string;
  className: string;
  teacherName: string;
  appUrl: string;
};

export async function sendClassInviteEmail({
  to,
  className,
  teacherName,
  appUrl,
}: InviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  const client = getResendClient();
  if (!client) {
    // No API key configured — skip sending but don't fail the invite.
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const { error } = await client.emails.send({
    from: "EduFlix <noreply@eduflix.app>",
    to,
    subject: `You've been invited to join "${className}" on EduFlix`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #6d28d9; font-size: 22px; margin-bottom: 16px;">You've been invited to a class on EduFlix</h1>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          <strong>${teacherName}</strong> has invited you to join the class
          <strong>"${className}"</strong> on EduFlix.
        </p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          EduFlix turns screen time into study time — your teacher will assign
          educational films and series scenes for you to watch and learn from.
        </p>
        <a href="${appUrl}/auth"
           style="display: inline-block; background: #6d28d9; color: #fff; text-decoration: none;
                  padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0;">
          Sign in to EduFlix
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          You'll be automatically added to the class when you sign in with this email address.
        </p>
      </div>
    `,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
