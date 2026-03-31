import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "SeniorShield <onboarding@resend.dev>";
const APP_NAME = "SeniorShield";

export async function sendVerificationEmail(email: string, token: string, firstName?: string | null) {
  const domain = process.env.REPLIT_DEV_DOMAIN || "localhost:8080";
  const verifyUrl = `https://${domain}/api/auth/verify-email?token=${token}`;

  const name = firstName || "there";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Verify your ${APP_NAME} account`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email – ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">🛡️</div>
              <h1 style="color:#FFFFFF;margin:8px 0 0 0;font-size:26px;font-weight:700;">${APP_NAME}</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:14px;">Your safety companion</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Hello, ${name}! 👋</h2>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px 0;">
                Welcome to ${APP_NAME}! Please confirm your email address to activate your account and start using your voice assistant, scam protection, and family alerts.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:17px;font-weight:700;padding:16px 40px;border-radius:12px;letter-spacing:0.3px;">
                  ✓ Verify My Email
                </a>
              </div>
              <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0 0 16px 0;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
              <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0;">
                Having trouble with the button above? Copy and paste this link into your browser:<br />
                <span style="color:#2563EB;word-break:break-all;">${verifyUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                © 2026 ${APP_NAME} · Protecting seniors from scams and tech confusion
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
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

export async function sendWelcomeEmail(email: string, firstName?: string | null) {
  const name = firstName || "there";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Welcome to ${APP_NAME}! You're all set 🛡️`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">🛡️</div>
              <h1 style="color:#FFFFFF;margin:8px 0 0 0;font-size:26px;font-weight:700;">${APP_NAME}</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:14px;">Your safety companion</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Welcome, ${name}! 🎉</h2>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px 0;">
                You're now part of the ${APP_NAME} family. Your account is ready — here's what you can do:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:22px;margin-right:12px;">🎙️</span>
                    <strong style="color:#1E293B;font-size:15px;">Voice Assistant</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">Ask anything, get clear step-by-step help</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:22px;margin-right:12px;">🚨</span>
                    <strong style="color:#1E293B;font-size:15px;">Scam Detection</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">Paste suspicious messages to check them instantly</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;">
                    <span style="font-size:22px;margin-right:12px;">👨‍👩‍👧</span>
                    <strong style="color:#1E293B;font-size:15px;">Family Alerts</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">Stay connected and keep loved ones informed</p>
                  </td>
                </tr>
              </table>
              <p style="color:#475569;font-size:15px;line-height:24px;margin:0;">
                If you ever need help, your AI assistant is always one tap away. We're here for you every step of the way.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                © 2026 ${APP_NAME} · Protecting seniors from scams and tech confusion
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
    throw new Error(`Welcome email failed: ${error.message}`);
  }

  return data;
}

export async function sendPasswordResetEmail(email: string, token: string, firstName?: string | null) {
  const domain = process.env.REPLIT_DEV_DOMAIN || "localhost:8080";
  const resetUrl = `https://${domain}/api/auth/reset-password?token=${token}`;
  const name = firstName || "there";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Reset your ${APP_NAME} password`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);padding:36px 40px;text-align:center;">
            <h1 style="color:#FFFFFF;margin:0;font-size:26px;">🛡️ ${APP_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Hi ${name},</h2>
            <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px 0;">
              We received a request to reset your password. Click the button below to choose a new password.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:17px;font-weight:700;padding:16px 40px;border-radius:12px;">
                Reset My Password
              </a>
            </div>
            <p style="color:#94A3B8;font-size:13px;text-align:center;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

export async function sendScamAlertEmail(
  recipientEmail: string,
  recipientName: string | null,
  senderName: string,
  riskScore: number,
  riskLevel: string,
  scamCategory: string,
  recommendation: string,
) {
  const name = recipientName || "there";
  const riskLabel = riskLevel.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const riskColor = riskLevel === "critical_risk" ? "#DC2626" : riskLevel === "high_risk" ? "#EA580C" : "#F59E0B";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [recipientEmail],
    subject: `${APP_NAME} Alert: ${senderName} detected a ${riskLabel} scam`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scam Alert – ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#DC2626,#EF4444);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">&#x1F6A8;</div>
              <h1 style="color:#FFFFFF;margin:8px 0 0 0;font-size:26px;font-weight:700;">${APP_NAME} Scam Alert</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0 0;font-size:14px;">Family Protection Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Hi ${name},</h2>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px 0;">
                <strong>${senderName}</strong> used ${APP_NAME} to analyze a suspicious message and it was flagged as potentially dangerous. They wanted you to be aware.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:12px;padding:20px;margin:0 0 24px 0;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#64748B;font-size:13px;">Risk Level</span><br/>
                          <span style="color:${riskColor};font-size:18px;font-weight:700;">${riskLabel}</span>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="color:#64748B;font-size:13px;">Risk Score</span><br/>
                          <span style="color:${riskColor};font-size:28px;font-weight:700;">${riskScore}</span><span style="color:#94A3B8;font-size:16px;">/100</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:12px 0 4px 0;border-top:1px solid #FECACA;">
                          <span style="color:#64748B;font-size:13px;">Category</span><br/>
                          <span style="color:#1E293B;font-size:15px;font-weight:600;">${scamCategory}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:8px 0 0 0;">
                          <span style="color:#64748B;font-size:13px;">Recommendation</span><br/>
                          <span style="color:#DC2626;font-size:15px;font-weight:600;">${recommendation}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color:#475569;font-size:15px;line-height:24px;margin:0 0 8px 0;">
                <strong>What you can do:</strong>
              </p>
              <ul style="color:#475569;font-size:15px;line-height:28px;margin:0 0 20px 0;padding-left:20px;">
                <li>Check in with ${senderName} to make sure they didn't respond or share personal information</li>
                <li>Help them block the sender or delete the message</li>
                <li>Remind them to never share passwords, bank details, or Social Security numbers</li>
              </ul>
              <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0;">
                This alert was sent because you are listed as a trusted family member in ${senderName}'s ${APP_NAME} account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                &copy; 2026 ${APP_NAME} &middot; Protecting seniors from scams and tech confusion
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
    throw new Error(`Scam alert email failed: ${error.message}`);
  }

  return data;
}

export async function sendFamilyMemberNotificationEmail(
  recipientEmail: string,
  recipientName: string | null,
  seniorName: string,
  relationship: string,
) {
  const name = recipientName || "there";
  const relLabel = relationship.charAt(0).toUpperCase() + relationship.slice(1);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [recipientEmail],
    subject: `${seniorName} added you to their ${APP_NAME} safety network`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been added to ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">&#x1F6E1;&#xFE0F;</div>
              <h1 style="color:#FFFFFF;margin:8px 0 0 0;font-size:26px;font-weight:700;">${APP_NAME}</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:14px;">Family Safety Network</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Hi ${name}! &#x1F44B;</h2>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px 0;">
                <strong>${seniorName}</strong> has added you as their <strong>${relLabel}</strong> in ${APP_NAME}, a mobile app designed to keep seniors safe and confident with technology.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;margin:0 0 24px 0;">
                <tr><td style="padding:20px;">
                  <h3 style="color:#1E40AF;font-size:16px;margin:0 0 12px 0;">&#x1F6E1;&#xFE0F; What is ${APP_NAME}?</h3>
                  <p style="color:#475569;font-size:14px;line-height:22px;margin:0;">
                    ${APP_NAME} is a safety companion app built specifically for seniors aged 65 and older. It provides a friendly AI voice assistant that helps with everyday technology questions, a scam detection engine that analyzes suspicious messages, and a family alert system that keeps loved ones informed.
                  </p>
                </td></tr>
              </table>
              <h3 style="color:#1E293B;font-size:16px;margin:0 0 12px 0;">Why were you selected?</h3>
              <p style="color:#475569;font-size:15px;line-height:24px;margin:0 0 20px 0;">
                ${seniorName} trusts you and wants you to be part of their safety network. As a family member in ${APP_NAME}, here's what you can expect:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:22px;margin-right:12px;">&#x1F6A8;</span>
                    <strong style="color:#1E293B;font-size:15px;">Scam Alerts</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">You'll receive an email alert if ${seniorName} encounters a suspicious message that could be a scam</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:22px;margin-right:12px;">&#x1F198;</span>
                    <strong style="color:#1E293B;font-size:15px;">Emergency Notifications</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">If ${seniorName} uses the SOS feature in an emergency, you'll be notified immediately</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;">
                    <span style="font-size:22px;margin-right:12px;">&#x1F4CB;</span>
                    <strong style="color:#1E293B;font-size:15px;">Weekly Safety Summaries</strong>
                    <p style="color:#64748B;font-size:14px;margin:4px 0 0 34px;">A periodic overview of how ${seniorName} is using the app and any safety events</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;margin:0 0 24px 0;">
                <tr><td style="padding:16px 20px;">
                  <p style="color:#166534;font-size:14px;line-height:22px;margin:0;">
                    <strong>&#x2705; No action needed right now.</strong> You're all set! You'll only receive emails when something important happens. You can unsubscribe from any notification at any time.
                  </p>
                </td></tr>
              </table>
              <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0;">
                This email was sent because ${seniorName} listed you as a trusted family member in their ${APP_NAME} account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                &copy; 2026 ${APP_NAME} &middot; Protecting seniors from scams and tech confusion
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
    throw new Error(`Family notification email failed: ${error.message}`);
  }

  return data;
}

function billingEmailWrapper(title: string, headerBg: string, headerIcon: string, headerSubtitle: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title} – ${APP_NAME}</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${headerBg};padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">${headerIcon}</div>
            <h1 style="color:#FFFFFF;margin:8px 0 0 0;font-size:26px;font-weight:700;">${APP_NAME}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:14px;">${headerSubtitle}</p>
          </td>
        </tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr>
          <td style="background:#F8FAFC;padding:20px 40px;text-align:center;">
            <p style="color:#94A3B8;font-size:12px;margin:0;">&copy; 2026 ${APP_NAME} &middot; Protecting seniors from scams and tech confusion</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPaymentSuccessEmail(email: string, firstName: string | null, plan: string, amount: string) {
  const name = firstName || "there";
  const body = `
    <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Payment Confirmed! 🎉</h2>
    <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px 0;">
      Hi ${name}, your payment has been processed successfully. Here are the details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;margin:0 0 24px 0;">
      <tr><td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #BBF7D0;">
              <span style="color:#64748B;font-size:13px;">Plan</span><br/>
              <span style="color:#1E293B;font-size:16px;font-weight:600;">${plan}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #BBF7D0;">
              <span style="color:#64748B;font-size:13px;">Amount Charged</span><br/>
              <span style="color:#16A34A;font-size:22px;font-weight:700;">${amount}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="color:#64748B;font-size:13px;">Status</span><br/>
              <span style="color:#16A34A;font-size:16px;font-weight:600;">✅ Active</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="color:#475569;font-size:15px;line-height:24px;margin:0 0 8px 0;">
      You now have full access to all premium features including scam detection, family alerts, and 24/7 voice assistance.
    </p>
    <p style="color:#94A3B8;font-size:13px;text-align:center;margin:16px 0 0 0;">
      You can manage or cancel your subscription anytime from the app's Settings.
    </p>`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `${APP_NAME} — Payment Confirmed ✅`,
    html: billingEmailWrapper("Payment Confirmed", "linear-gradient(135deg,#16A34A,#22C55E)", "✅", "Payment Receipt", body),
  });

  if (error) throw new Error(`Payment success email failed: ${error.message}`);
  return data;
}

export async function sendPaymentFailedEmail(email: string, firstName: string | null, reason: string) {
  const name = firstName || "there";
  const body = `
    <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Payment Issue ⚠️</h2>
    <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px 0;">
      Hi ${name}, we weren't able to process your recent payment. Here's what happened:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:12px;border:1px solid #FECACA;margin:0 0 24px 0;">
      <tr><td style="padding:20px;">
        <span style="color:#64748B;font-size:13px;">Reason</span><br/>
        <span style="color:#DC2626;font-size:16px;font-weight:600;">${reason}</span>
      </td></tr>
    </table>
    <p style="color:#475569;font-size:15px;line-height:24px;margin:0 0 20px 0;">
      <strong>What you can do:</strong>
    </p>
    <ul style="color:#475569;font-size:15px;line-height:28px;margin:0 0 20px 0;padding-left:20px;">
      <li>Check that your card details are correct and up to date</li>
      <li>Make sure your card has sufficient funds</li>
      <li>Try a different payment method</li>
      <li>Contact your bank if the issue persists</li>
    </ul>
    <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0;">
      No charges were made. You can try again anytime from the app.
    </p>`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `${APP_NAME} — Payment Issue ⚠️`,
    html: billingEmailWrapper("Payment Issue", "linear-gradient(135deg,#DC2626,#EF4444)", "⚠️", "Payment Notification", body),
  });

  if (error) throw new Error(`Payment failed email failed: ${error.message}`);
  return data;
}

export async function sendSubscriptionCancelledEmail(email: string, firstName: string | null) {
  const name = firstName || "there";
  const body = `
    <h2 style="color:#1E293B;font-size:22px;margin:0 0 12px 0;">Subscription Cancelled</h2>
    <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px 0;">
      Hi ${name}, your ${APP_NAME} subscription has been cancelled as requested.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border-radius:12px;border:1px solid #FDE68A;margin:0 0 24px 0;">
      <tr><td style="padding:20px;">
        <span style="color:#92400E;font-size:15px;font-weight:600;">📋 Important:</span>
        <p style="color:#78350F;font-size:15px;line-height:24px;margin:8px 0 0 0;">
          You'll continue to have full access to all premium features until the end of your current billing period. After that, your account will switch to the free plan.
        </p>
      </td></tr>
    </table>
    <p style="color:#475569;font-size:15px;line-height:24px;margin:0 0 20px 0;">
      We're sorry to see you go. If you change your mind, you can resubscribe anytime from the app.
    </p>
    <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0;">
      If you have feedback about your experience, we'd love to hear from you.
    </p>`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `${APP_NAME} — Subscription Cancelled`,
    html: billingEmailWrapper("Subscription Cancelled", "linear-gradient(135deg,#92400E,#D97706)", "📋", "Account Update", body),
  });

  if (error) throw new Error(`Cancellation email failed: ${error.message}`);
  return data;
}
