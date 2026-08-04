import { SITE_URL } from "@/lib/site-url";

const siteUrl = SITE_URL;
const brandColor = "#C68A8A";
const ink = "#2F2A28";
const cream = "#FAF7F2";
const sand = "#F3E9DE";

/**
 * Branded shell shared by every transactional email.
 *
 * Email clients are not browsers: Outlook renders through Word, Gmail strips
 * <style> blocks from forwarded copies, and none of them reliably support
 * flexbox or grid. So this is deliberately a nested-table layout with inline
 * styles — the only thing that renders consistently — with a media query layered
 * on top as progressive enhancement rather than as the mechanism holding the
 * layout together.
 *
 * The previous version was locked to width="480" with no viewport meta, so it
 * overflowed on narrow phones. Width is now fluid up to 600px.
 */
export function emailShell(title: string, bodyHtml: string, preheader?: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
  <style>
    /* Progressive enhancement only — the table layout stands on its own. */
    @media only screen and (max-width: 620px) {
      .sg-wrap { width: 100% !important; }
      .sg-pad { padding: 24px 20px !important; }
      .sg-head { padding: 20px 16px !important; }
      .sg-h1 { font-size: 20px !important; }
      .sg-btn a { display: block !important; text-align: center !important; }
    }
    a { color: ${brandColor}; }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${cream};-webkit-font-smoothing:antialiased;">
  <!-- Preheader: the grey preview line shown next to the subject in most inboxes.
       Hidden in the body itself, then padded so no other copy leaks into it. -->
  <div style="display:none;font-size:1px;color:${cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader || title)}${"&#847;&zwnj;&nbsp;".repeat(60)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${cream};">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table role="presentation" class="sg-wrap" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EDE4DA;">

          <tr>
            <td class="sg-head" align="center" style="background-color:${ink};padding:26px 24px;">
              <img src="${siteUrl}/logo.png" alt="Seoul Glow Bangladesh" width="52" height="52"
                   style="border-radius:50%;display:block;margin:0 auto 10px;border:0;outline:none;text-decoration:none;" />
              <div style="color:${cream};font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;letter-spacing:0.06em;">
                Seoul Glow Bangladesh
              </div>
              <div style="color:#B9AFA6;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;margin-top:5px;">
                Authentic Korean Skincare
              </div>
            </td>
          </tr>

          <tr>
            <td class="sg-pad" style="padding:34px 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${ink};">
              ${bodyHtml}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 28px;background:${sand};font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#6B6055;">
              &copy; ${new Date().getFullYear()} Seoul Glow Bangladesh &middot; Dhaka, Bangladesh<br />
              <a href="${siteUrl}" style="color:${brandColor};text-decoration:none;">${siteUrl.replace(/^https?:\/\//, "")}</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Bulletproof-ish CTA. Outlook ignores border-radius and padding on anchors, so
 * the anchor carries its own background and a bgcolor-bearing cell sits behind
 * it, rather than relying on a styled wrapper alone.
 */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="sg-btn" style="margin:22px 0 6px;">
    <tr>
      <td align="center" bgcolor="${brandColor}" style="border-radius:999px;">
        <a href="${url}"
           style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/** Section heading used at the top of each email body. */
export function heading(text: string): string {
  return `<h1 class="sg-h1" style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.3;font-weight:600;color:${ink};">${escapeHtml(text)}</h1>`;
}

/** Muted footnote, e.g. "if you didn't request this, ignore this email". */
export function note(text: string): string {
  return `<p style="margin:18px 0 0;font-size:12.5px;line-height:1.6;color:#8A8079;">${escapeHtml(text)}</p>`;
}

export function divider(): string {
  return `<div style="height:1px;background:#EDE4DA;margin:24px 0;"></div>`;
}

/**
 * Escapes text interpolated into email HTML. Customer names, order numbers and
 * product titles are user- or admin-supplied, and an unescaped angle bracket
 * would corrupt the markup — or inject into a mail client that renders it.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
