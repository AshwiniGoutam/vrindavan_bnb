/** Minimal, brand-consistent transactional email layout (inline styles for email clients). */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailLayout(opts: { preheader?: string; heading: string; intro?: string; rows?: [string, string][]; footerNote?: string; cta?: { label: string; href: string } }) {
  const rows = (opts.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e8e2d7;color:#6f685e;font-size:13px;width:40%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e8e2d7;color:#1d1c1a;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f2efe8;font-family:Helvetica,Arial,sans-serif">
<span style="display:none">${esc(opts.preheader ?? "")}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe8;padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f8f6f1;padding:40px">
<tr><td style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#0e0d0c">VHI</td></tr>
<tr><td style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#5c5245;padding-bottom:28px">LUXURY HOMESTAYS · VRINDAVAN</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:26px;color:#0e0d0c;padding-bottom:12px">${esc(opts.heading)}</td></tr>
${opts.intro ? `<tr><td style="font-size:15px;line-height:1.6;color:#1d1c1a;padding-bottom:20px">${esc(opts.intro)}</td></tr>` : ""}
${rows ? `<tr><td><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
${opts.cta ? `<tr><td style="padding-top:28px"><a href="${esc(opts.cta.href)}" style="background:#1d1c1a;color:#f2efe8;text-decoration:none;padding:14px 24px;font-size:13px;letter-spacing:1px">${esc(opts.cta.label)}</a></td></tr>` : ""}
${opts.footerNote ? `<tr><td style="font-size:12px;color:#6f685e;padding-top:28px;line-height:1.6">${esc(opts.footerNote)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
