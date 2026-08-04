import { SITE_URL } from "@/lib/site-url";
const siteUrl = SITE_URL;
const brandColor = "#C68A8A";

/** Wraps inner HTML content in a consistent branded email shell (logo header + footer). */
export function emailShell(title: string, bodyHtml: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /><title>${title}</title></head>
  <body style="margin:0;padding:0;background-color:#FAF7F2;font-family:Helvetica,Arial,sans-serif;color:#2F2A28;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#2F2A28;padding:24px;text-align:center;">
                <img src="${siteUrl}/logo.png" alt="Seoul Glow Bangladesh" width="48" height="48" style="border-radius:50%;display:block;margin:0 auto 8px;" />
                <span style="color:#FAF7F2;font-size:18px;font-weight:600;letter-spacing:0.05em;">Seoul Glow Bangladesh</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#F3E9DE;text-align:center;font-size:11px;color:#6B6B4A;">
                © ${new Date().getFullYear()} Seoul Glow Bangladesh · Dhaka, Bangladesh<br/>
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

export function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;margin-top:16px;">${label}</a>`;
}
