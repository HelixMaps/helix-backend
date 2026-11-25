const axios = require("axios");

/**
 * Send an email notification when a user is invited or added to a mind map
 */
const sendMapInviteEmail = async ({ toEmail, inviterEmail, mapTitle, mapId, role }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Helix Mind Map";
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  console.log(`[EmailService] Preparing invite email to: ${toEmail}, sender: ${senderEmail || "NOT_SET"}, mapTitle: "${mapTitle}"`);

  if (!apiKey || !senderEmail) {
    console.error(`[EmailService] Missing configuration! BREVO_API_KEY present: ${Boolean(apiKey)}, BREVO_SENDER_EMAIL: "${senderEmail || ""}". Skipping email.`);
    return { success: false, reason: "Missing configuration in environment variables" };
  }

  const mapUrl = `${clientUrl}/dashboard?mapId=${mapId}`;
  const capitalizedRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Editor";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>You've been added to a Helix mind map</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #fafafa; -webkit-font-smoothing: antialiased;">
    <!-- Outer Canvas Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050505; padding: 48px 16px;">
      <tr>
        <td align="center">
          <!-- Main Container (540px) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #0B0C0F; border: 1px solid #1f2229; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.9);">
            
            <!-- Top Emerald Accent Line -->
            <tr>
              <td height="2" style="background: linear-gradient(90deg, #050505 0%, #10b981 50%, #050505 100%); background-color: #10b981; font-size: 0; line-height: 0;">
                &nbsp;
              </td>
            </tr>

            <!-- Top Brand Bar -->
            <tr>
              <td style="padding: 28px 32px 24px; border-bottom: 1px solid #181a20;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" valign="middle">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <img
                              src="${clientUrl}/helix-logo.svg"
                              alt="Helix"
                              width="28"
                              height="28"
                              style="display: block; width: 28px; height: 28px; border-radius: 7px; border: 1px solid #23262f; background-color: #12141a;"
                            />
                          </td>
                          <td valign="middle">
                            <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.16em; color: #f4f4f5; text-transform: uppercase;">
                              HELIX
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" valign="middle">
                      <span style="display: inline-block; padding: 4px 10px; background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 9999px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 600; color: #34d399; text-transform: uppercase; letter-spacing: 0.08em;">
                        &#9679; Workspace Invite
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content Body -->
            <tr>
              <td style="padding: 32px;">
                <!-- Headline -->
                <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; line-height: 1.25; color: #ffffff; letter-spacing: -0.025em;">
                  You've been added to a mind map.
                </h1>

                <!-- Invite Context -->
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #a1a1aa;">
                  <strong style="color: #f4f4f5; font-weight: 600;">${inviterEmail || "A team member"}</strong> invited you to collaborate as an
                  <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.28); color: #6ee7b7; padding: 1px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; font-weight: 600; vertical-align: baseline;">
                    ${capitalizedRole}
                  </span>
                </p>

                <!-- Node-Style Map Preview Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; background-color: #111318; border: 1px solid #22252e; border-left: 3px solid #10b981; border-radius: 12px;">
                  <tr>
                    <td style="padding: 18px 20px;">
                      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #34d399; margin-bottom: 6px;">
                        SPATIAL WORKSPACE
                      </div>
                      <div style="font-size: 18px; font-weight: 600; color: #ffffff; letter-spacing: -0.01em; line-height: 1.35;">
                        ${mapTitle}
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Primary Crisp White CTA Button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                  <tr>
                    <td align="left">
                      <a
                        href="${mapUrl}"
                        style="display: inline-block; background-color: #ffffff; color: #050505; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 26px; border-radius: 10px; letter-spacing: -0.01em;"
                      >
                        Open Mind Map &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                  <tr>
                    <td height="1" style="background-color: #181a20; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>

                <!-- Fallback Link -->
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #71717a;">
                  Or copy and paste this link directly into your browser:<br />
                  <a href="${mapUrl}" style="color: #34d399; text-decoration: none; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; word-break: break-all;">
                    ${mapUrl}
                  </a>
                </p>
              </td>
            </tr>

            <!-- Minimal Footer -->
            <tr>
              <td style="padding: 18px 32px; background-color: #08090B; border-top: 1px solid #181a20;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" style="font-size: 11px; color: #52525b;">
                      &copy; 2026 Helix. The canvas for the complex mind.
                    </td>
                    <td align="right" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; color: #52525b;">
                      v1.0
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
          },
        ],
        subject: `You've been invited to collaborate on "${mapTitle}" on Helix`,
        htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(`[EmailService] Invitation email successfully sent to ${toEmail}. Message ID: ${response.data?.messageId}`);
    return { success: true, messageId: response.data?.messageId };
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[EmailService] Failed to send invite email to ${toEmail}:`, errorDetails);
    return { success: false, error: errorDetails };
  }
};

module.exports = {
  sendMapInviteEmail,
};
