import { Resend } from "resend";

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export type SendTeamInviteEmailParams = {
  to: string;
  inviterName?: string;
  teamName: string;
  acceptUrl: string;
  role?: string;
};

/**
 * Send a beautifully formatted, brand-aligned Team Invitation email via Resend.
 */
export async function sendTeamInviteEmail({
  to,
  inviterName = "A team admin",
  teamName,
  acceptUrl,
  role = "member",
}: SendTeamInviteEmailParams): Promise<{ sent: boolean; id?: string }> {
  const resend = getResendClient();
  const from =
    process.env.EMAIL_FROM?.trim() || "Ghost n Post <onboarding@resend.dev>";

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not set. Skipped sending invite email to ${to}. Invite link: ${acceptUrl}`,
    );
    return { sent: false };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `${inviterName} invited you to join ${teamName} on Ghost n Post`,
      text: `${inviterName} has invited you to join the ${teamName} workspace on Ghost n Post.\n\nAccept your invitation here:\n${acceptUrl}\n\nThis invitation will expire in 14 days.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation — Ghost n Post</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050504; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Inbox Preheader Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${inviterName} has invited you to join ${teamName} on Ghost n Post. Accept your team invitation to start collaborating.
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050504; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0c0d0e; border: 1px solid #282b2e; border-radius: 6px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px; background-color: #121416; border-bottom: 1px solid #282b2e;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 900; color: #f2efe6; letter-spacing: -0.03em; font-family: 'Space Grotesk', -apple-system, sans-serif;">GHOST N POST</span>
                  </td>
                  <td align="right">
                    <span style="background-color: #e8ff47; color: #0c0d0e; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">TEAM INVITE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px; color: #f2efe6;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                You've been invited to join <span style="color: #e8ff47;">${teamName}</span>
              </h1>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.5; color: #b0aaa0;">
                <strong style="color: #ffffff;">${inviterName}</strong> has invited you to collaborate in the <strong style="color: #ffffff;">${teamName}</strong> workspace as an <strong style="color: #e8ff47;">${role}</strong>.
              </p>

              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.5; color: #8f8a7c;">
                Together, your team can repurpose YouTube videos into high-performing LinkedIn posts and X threads with unified style profiles and shared credit allowances.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" target="_blank" style="display: inline-block; background-color: #e8ff47; color: #0c0d0e; font-size: 15px; font-weight: 800; padding: 14px 32px; text-decoration: none; border-radius: 4px; box-shadow: 0 4px 14px rgba(232,255,71,0.25);">
                      Accept Team Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Note & Fallback Link -->
              <div style="background-color: #141618; border: 1px solid #282b2e; border-radius: 4px; padding: 16px; margin-bottom: 12px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #8f8a7c; font-weight: 600;">
                  Button not working? Copy and paste this link into your browser:
                </p>
                <p style="margin: 0; font-size: 12px; font-family: monospace; word-break: break-all; color: #e8ff47;">
                  <a href="${acceptUrl}" style="color: #e8ff47; text-decoration: underline;">${acceptUrl}</a>
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #6b665c;">
                ⏳ This invitation will expire in 14 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #080809; border-top: 1px solid #1c1e20; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b665c;">
                Ghost n Post &middot; YouTube to LinkedIn & X Content Engine
              </p>
              <p style="margin: 0; font-size: 11px; color: #4a4740;">
                <a href="https://www.ghostnpost.com/privacy" style="color: #8f8a7c; text-decoration: none;">Privacy Policy</a> &middot; 
                <a href="https://www.ghostnpost.com/contact" style="color: #8f8a7c; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[email] Resend team invite error:", error);
      return { sent: false };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[email] Failed to send team invite email via Resend:", err);
    return { sent: false };
  }
}

export type SendWelcomeEmailParams = {
  to: string;
  userName?: string;
};

/**
 * Send a high-converting Welcome Email to new users upon account registration.
 */
export async function sendWelcomeEmail({
  to,
  userName = "Creator",
}: SendWelcomeEmailParams): Promise<{ sent: boolean; id?: string }> {
  const resend = getResendClient();
  const from =
    process.env.EMAIL_FROM?.trim() || "Ghost n Post <onboarding@resend.dev>";

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not set. Skipped sending welcome email to ${to}.`,
    );
    return { sent: false };
  }

  const firstName = userName.split(" ")[0] || "Creator";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Welcome to Ghost n Post, ${firstName}! ⚡ Your 20 Free Credits are ready`,
      text: `Hi ${firstName},\n\nWelcome to Ghost n Post! Your 20 free monthly credits are ready on your account.\n\nQuick Steps:\n1. Paste any YouTube video link to generate post drafts.\n2. Click "Match my voice" to upload past sample posts.\n3. Install our Chrome Extension to generate posts directly on YouTube.\n\nStart creating posts:\nhttps://www.ghostnpost.com\n\n- The Ghost n Post Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ghost n Post</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050504; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Inbox Preheader Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    Welcome to Ghost n Post! Turn long YouTube videos into publish-ready LinkedIn posts and X threads in 90 seconds. Your 20 free credits are ready.
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050504; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0c0d0e; border: 1px solid #282b2e; border-radius: 6px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px; background-color: #121416; border-bottom: 1px solid #282b2e;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 900; color: #f2efe6; letter-spacing: -0.03em; font-family: 'Space Grotesk', -apple-system, sans-serif;">GHOST N POST</span>
                  </td>
                  <td align="right">
                    <span style="background-color: #e8ff47; color: #0c0d0e; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">WELCOME</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px; color: #f2efe6;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Welcome aboard, ${firstName}! 🎉
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #b0aaa0;">
                Turn your long-form YouTube videos into publish-ready LinkedIn posts and X threads in under 90 seconds.
              </p>

              <!-- Credit Box -->
              <div style="background-color: #141618; border: 1px solid #e8ff47; border-radius: 4px; padding: 20px; margin-bottom: 28px; text-align: center;">
                <span style="font-size: 28px; display: block; margin-bottom: 4px;">⚡</span>
                <span style="font-size: 20px; font-weight: 900; color: #e8ff47; display: block;">20 Free Monthly Credits</span>
                <span style="font-size: 13px; color: #b0aaa0; display: block; margin-top: 4px;">Ready on your account today. No credit card required.</span>
              </div>

              <h2 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">
                3 Quick Steps to Get Started:
              </h2>

              <ul style="margin: 0 0 28px 0; padding-left: 20px; color: #b0aaa0; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 10px;">
                  <strong style="color: #ffffff;">Paste a YouTube Link:</strong> Any video link &rarr; instant AI transcript extraction & post drafts.
                </li>
                <li style="margin-bottom: 10px;">
                  <strong style="color: #ffffff;">Match My Voice:</strong> Click "Match my voice" in the app header and paste 2-3 of your past posts so generated drafts sound like <em>you</em>.
                </li>
                <li style="margin-bottom: 10px;">
                  <strong style="color: #ffffff;">Chrome Extension:</strong> Install our Chrome Extension to repurpose videos directly from YouTube with 1 click.
                </li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://www.ghostnpost.com" target="_blank" style="display: inline-block; background-color: #e8ff47; color: #0c0d0e; font-size: 15px; font-weight: 800; padding: 14px 32px; text-decoration: none; border-radius: 4px; box-shadow: 0 4px 14px rgba(232,255,71,0.25);">
                      Generate Your First Post &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #080809; border-top: 1px solid #1c1e20; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b665c;">
                Ghost n Post &middot; YouTube to LinkedIn & X Content Engine
              </p>
              <p style="margin: 0; font-size: 11px; color: #4a4740;">
                <a href="https://www.ghostnpost.com/pricing" style="color: #8f8a7c; text-decoration: none;">Pricing</a> &middot; 
                <a href="https://www.ghostnpost.com/contact" style="color: #8f8a7c; text-decoration: none;">Support</a> &middot; 
                <a href="https://www.ghostnpost.com/privacy" style="color: #8f8a7c; text-decoration: none;">Privacy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[email] Resend welcome error:", error);
      return { sent: false };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[email] Failed to send welcome email via Resend:", err);
    return { sent: false };
  }
}
