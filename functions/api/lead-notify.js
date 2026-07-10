// Cloudflare Pages Function — /api/lead-notify
// For connect.meshieldfinancial.com — sends 2 emails via Brevo:
// 1) Notification to Miguelson  2) Confirmation to the client
//
// UPDATED: added plain-text fallback + physical address footer on the
// client confirmation email — both are strong anti-spam signals that
// help first-time recipients land in the inbox instead of spam.

export async function onRequestPost(context) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const BREVO_KEY = context.env.BREVO_API_KEY;

  if (!BREVO_KEY) {
    return new Response(JSON.stringify({ success: false, message: 'Email service not configured' }), { headers: CORS });
  }

  try {
    const body = await context.request.json();
    const name    = (body.FIRSTNAME || '').trim();
    const email   = (body.EMAIL || '').trim();
    const phone   = (body.SMS || '').trim();
    const service = (body.SERVICE_INTERESTED || 'Not specified').trim();
    const honeypot = (body.email_address_check || '').trim();

    // Spam protection — if honeypot field has anything, silently pretend success
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { headers: CORS });
    }

    if (!name || !email) {
      return new Response(JSON.stringify({ success: false, message: 'Name and email are required' }), { headers: CORS });
    }

    // ── Email 1: Notify Miguelson ──────────────────────────────────────────
    const notifyRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'ME Shield Connect', email: 'info@meshieldfinancial.com' },
        to: [{ email: 'meshieldservices@gmail.com', name: 'Miguelson Etienne' }],
        replyTo: { email: email, name: name },
        subject: `New Consultation Request — ${name}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#0B1D3A;">New Free Consultation Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Interested in:</strong> ${service}</p>
            <p style="color:#888;font-size:.85rem;">Submitted from connect.meshieldfinancial.com</p>
          </div>
        `,
      }),
    });

    // ── Email 2: Confirm to the client ─────────────────────────────────────
    const serviceLine = service && service !== 'Not specified' ? ` about ${service}` : '';

    const confirmHtml = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAF7F1;border-radius:16px;overflow:hidden;">
        <div style="background:#0B1D3A;padding:24px 28px;text-align:center;">
          <div style="font-family:Georgia,serif;font-size:1.1rem;color:#fff;font-weight:700;">ME Shield Financial Services</div>
        </div>
        <div style="padding:30px 28px;">
          <p style="font-size:1rem;color:#0B1D3A;">Hi ${name},</p>
          <p style="font-size:.92rem;color:#555;line-height:1.7;">
            Thank you for reaching out! I received your request${serviceLine} and will personally follow up with you within 24 hours.
          </p>
          <p style="font-size:.92rem;color:#555;line-height:1.7;">
            If you need to reach me sooner, feel free to call or text (407) 267-2652.
          </p>
          <p style="font-size:.92rem;color:#555;">— Miguelson Etienne</p>
        </div>
        <div style="padding:16px 28px 24px;border-top:1px solid rgba(11,29,58,.08);">
          <p style="font-size:.68rem;color:#999;line-height:1.6;margin:0;">
            ME Shield Financial Services · Apopka, FL 32712 · (407) 267-2652<br/>
            You're receiving this because you requested a consultation at connect.meshieldfinancial.com.
            If this wasn't you, please disregard this email or reply to let us know.
          </p>
        </div>
      </div>
    `;

    const confirmText =
`Hi ${name},

Thank you for reaching out! I received your request${serviceLine} and will personally follow up with you within 24 hours.

If you need to reach me sooner, feel free to call or text (407) 267-2652.

— Miguelson Etienne
ME Shield Financial Services

--
ME Shield Financial Services · Apopka, FL 32712 · (407) 267-2652
You're receiving this because you requested a consultation at connect.meshieldfinancial.com.
If this wasn't you, please disregard this email or reply to let us know.`;

    const confirmRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Miguelson Etienne — ME Shield', email: 'info@meshieldfinancial.com' },
        to: [{ email: email, name: name }],
        subject: `Thanks for reaching out, ${name}!`,
        htmlContent: confirmHtml,
        textContent: confirmText,
      }),
    });

    const notifyOk = notifyRes.ok;
    const confirmOk = confirmRes.ok;

    return new Response(JSON.stringify({
      success: notifyOk,
      clientEmailSent: confirmOk,
    }), { headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
