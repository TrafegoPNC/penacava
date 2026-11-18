// API de Conversões da Meta — envia o evento Lead pelo servidor.
// Configure na Vercel (Settings > Environment Variables):
//   META_CAPI_TOKEN = token de acesso da API de Conversões
//   META_PIXEL_ID   = (opcional) ID do pixel; padrão abaixo
const PIXEL_ID = process.env.META_PIXEL_ID || '3609581765857285';
const GRAPH_VERSION = 'v21.0';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'META_CAPI_TOKEN não configurado' });
    return;
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const eventId = String(body.event_id || '').slice(0, 100);
  if (!eventId) {
    res.status(400).json({ error: 'event_id obrigatório' });
    return;
  }

  const forwarded = req.headers['x-forwarded-for'] || '';
  const ip = forwarded.split(',')[0].trim() || req.headers['x-real-ip'] || '';

  const userData = {
    client_ip_address: ip || undefined,
    client_user_agent: req.headers['user-agent'] || undefined,
    fbp: body.fbp || undefined,
    fbc: body.fbc || undefined,
  };

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: body.event_source_url || req.headers.referer || undefined,
      user_data: userData,
      custom_data: { content_name: body.content_name || 'Entrar no grupo WhatsApp' },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const r = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await r.json();
    res.status(r.ok ? 200 : 502).json(r.ok ? { ok: true, events_received: data.events_received } : { ok: false, error: data.error && data.error.message });
  } catch (err) {
    res.status(502).json({ ok: false, error: 'Falha ao contatar a Meta' });
  }
};
