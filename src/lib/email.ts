import { Resend } from 'resend';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendAuditReportEmail({
  to,
  url,
  overallScore,
  shareLink,
  pdfBuffer,
}: {
  to: string;
  url: string;
  overallScore: number;
  shareLink: string;
  pdfBuffer: Buffer | null;
}) {
  if (!isEmailConfigured()) {
    console.warn('[email] Resend not configured — skipping send to', to);
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL!;
  const subject = `Your WordPress Health Report — ${overallScore}/100`;

  const html = `
    <p>Hi,</p>
    <p>Your WordPress health audit for <strong>${escapeHtml(url)}</strong> is ready.</p>
    <p><strong>Overall score: ${overallScore}/100</strong></p>
    <p>Your full PDF report is attached. You can also view results online:</p>
    <p><a href="${escapeHtml(shareLink)}">${escapeHtml(shareLink)}</a></p>
    <p>— Chris Smith, Technical SEO</p>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    attachments: pdfBuffer
      ? [
          {
            filename: 'wordpress-health-report.pdf',
            content: pdfBuffer.toString('base64'),
          },
        ]
      : undefined,
  });

  if (error) throw new Error(error.message || 'Resend send failed');
  return data;
}
