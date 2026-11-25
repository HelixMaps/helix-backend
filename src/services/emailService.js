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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${inviterEmail || "A teammate"} invited you to ${mapTitle} — Helix Maps</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F6F5F2; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #141413; -webkit-font-smoothing: antialiased;">
    
    <!-- Warm Stone Outer Canvas -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6F5F2; padding: 48px 16px;">
      <tr>
        <td align="center">

          <!-- Top Micro-Label -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 490px; margin-bottom: 14px;">
            <tr>
              <td align="left" style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #78756E;">
                Workspace Access Pass
              </td>
              <td align="right" style="font-size: 11px; font-weight: 600; color: #78756E;">
                Helix Maps
              </td>
            </tr>
          </table>
          
          <!-- Main Pass Card (490px) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 490px; background-color: #FFFFFF; border: 1.5px solid #E6E4DD; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 36px -10px rgba(20, 20, 19, 0.08);">
            
            <!-- ── TOP SECTION: Brand & Inviter ── -->
            <tr>
              <td style="padding: 32px 34px 28px 34px; background-color: #FFFFFF;">
                
                <!-- Logo & Status Badge -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                  <tr>
                    <td align="left" valign="middle">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <img
                              src="${clientUrl}/helix-logo.svg"
                              alt="Helix Maps"
                              width="30"
                              height="30"
                              style="display: block; width: 30px; height: 30px; border-radius: 8px;"
                            />
                          </td>
                          <td valign="middle">
                            <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.03em; color: #141413;">
                              Helix Maps
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" valign="middle">
                      <span style="display: inline-block; background-color: #FFF1EE; border: 1px solid #FFD2C8; color: #E04322; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 5px 12px; border-radius: 9999px;">
                        Invited
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Bold Editorial Headline -->
                <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 800; line-height: 1.18; letter-spacing: -0.035em; color: #141413;">
                  Jump into a shared map with your team
                </h1>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57554F;">
                  <strong style="color: #141413; font-weight: 600;">${inviterEmail || "A teammate"}</strong> granted you <strong style="color: #141413; font-weight: 600;">${capitalizedRole}</strong> access to collaborate in real time.
                </p>

              </td>
            </tr>

            <!-- ── PERFORATION DIVIDER ── -->
            <tr>
              <td style="padding: 0 24px; background-color: #FFFFFF;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="1" style="border-bottom: 1.5px dashed #E2DFD7; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── BOTTOM SECTION: Map Ticket & CTA ── -->
            <tr>
              <td style="padding: 28px 34px 34px 34px; background-color: #FAF9F6;">
                
                <!-- Map Title Highlight Block -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #FFFFFF; border: 1.5px solid #E6E4DD; border-radius: 16px;">
                  <tr>
                    <td style="padding: 20px 22px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8C8980; margin-bottom: 6px;">
                        Map Workspace
                      </div>
                      <div style="font-size: 21px; font-weight: 800; line-height: 1.25; letter-spacing: -0.025em; color: #141413;">
                        ${mapTitle}
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 3-Column Bento Specs -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px;">
                  <tr>
                    <td width="32%" style="background-color: #FFFFFF; border: 1px solid #E6E4DD; border-radius: 12px; padding: 12px 10px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8C8980; margin-bottom: 3px;">
                        Role
                      </div>
                      <div style="font-size: 13px; font-weight: 700; color: #141413;">
                        ${capitalizedRole}
                      </div>
                    </td>
                    <td width="2%">&nbsp;</td>
                    <td width="32%" style="background-color: #FFFFFF; border: 1px solid #E6E4DD; border-radius: 12px; padding: 12px 10px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8C8980; margin-bottom: 3px;">
                        Views
                      </div>
                      <div style="font-size: 13px; font-weight: 700; color: #141413;">
                        2D &amp; 3D
                      </div>
                    </td>
                    <td width="2%">&nbsp;</td>
                    <td width="32%" style="background-color: #FFFFFF; border: 1px solid #E6E4DD; border-radius: 12px; padding: 12px 10px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8C8980; margin-bottom: 3px;">
                        Sync
                      </div>
                      <div style="font-size: 13px; font-weight: 700; color: #0D9488;">
                        Live
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Vibrant Coral-Tangerine CTA Button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <a
                        href="${mapUrl}"
                        style="display: block; background-color: #FF5A36; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 16px 28px; border-radius: 14px; text-align: center; letter-spacing: -0.01em; box-shadow: 0 8px 20px rgba(255, 90, 54, 0.28);"
                      >
                        Open Map &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Direct URL Fallback -->
                <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #8C8980; text-align: center;">
                  Trouble with the button? Paste this link into your browser:<br />
                  <a href="${mapUrl}" style="color: #57554F; text-decoration: underline; word-break: break-all;">
                    ${mapUrl}
                  </a>
                </p>

              </td>
            </tr>

          </table>
          <!-- End Main Pass Card -->

          <!-- Minimal Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 490px; margin-top: 22px;">
            <tr>
              <td align="center" style="font-size: 12px; color: #8C8980;">
                <strong style="color: #57554F; font-weight: 600;">Helix Maps</strong> &middot; Visual Spatial Canvas &middot; 2026
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
        subject: `${inviterEmail || "A teammate"} invited you to ${mapTitle} — Helix Maps`,
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
