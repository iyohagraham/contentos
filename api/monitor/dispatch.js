/**
 * Alert dispatcher — pluggable external delivery for operator notifications.
 *
 * Provider-agnostic (like the Music Engine): every channel is optional and wired by
 * an env var, so this is a NO-OP until a channel is configured — and the moment one
 * is, alerts go out with zero further code. Never throws (best-effort; logging an
 * alert must never break the notification agent).
 *
 * Channels (all optional):
 *   ALERT_WEBHOOK_URL        — generic JSON webhook (Slack/Discord/Zapier/custom).
 *                              POST { text, alerts, workspace_id }.
 *   ALERT_EMAIL_WEBHOOK_URL  — an email-sending HTTP endpoint (e.g. a Resend/SES/
 *                              Postmark proxy, or a serverless mailer). POST
 *                              { to, subject, body }. ALERT_EMAIL_TO sets the
 *                              recipient. (Direct SMTP is intentionally NOT done
 *                              here — serverless functions shouldn't hold SMTP
 *                              sockets; front it with an HTTP mailer.)
 *
 * Returns a summary of what was attempted (for the agent's output / logs).
 */

function severityRank(s) {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1
}

/**
 * Dispatch a batch of freshly-created alerts to whatever external channels are
 * configured. Filters to >= minSeverity (default 'warning') to avoid noise.
 * @param {Array<{ type, severity, title, body, dedupe_key }>} alerts
 * @param {{ workspaceId?: string, minSeverity?: 'info'|'warning'|'critical' }} [opts]
 * @returns {Promise<{ dispatched: number, channels: string[], skipped: string }>}
 */
export async function dispatchAlerts(alerts = [], opts = {}) {
  const min = severityRank(opts.minSeverity || 'warning')
  const toSend = (Array.isArray(alerts) ? alerts : []).filter((a) => severityRank(a.severity) >= min)
  const channels = []

  if (!toSend.length) return { dispatched: 0, channels, skipped: 'no alerts at/above min severity' }

  const text = toSend.map((a) => `[${a.severity || 'info'}] ${a.title}${a.body ? ` — ${a.body}` : ''}`).join('\n')

  // 1. Generic webhook (Slack/Discord/custom).
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(process.env.ALERT_WEBHOOK_KEY ? { Authorization: `Bearer ${process.env.ALERT_WEBHOOK_KEY}` } : {}) },
        body: JSON.stringify({ text, alerts: toSend, workspace_id: opts.workspaceId || null })
      })
      if (res.ok) channels.push('webhook')
    } catch { /* best-effort */ }
  }

  // 2. Email via an HTTP mailer endpoint.
  if (process.env.ALERT_EMAIL_WEBHOOK_URL && process.env.ALERT_EMAIL_TO) {
    try {
      const res = await fetch(process.env.ALERT_EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(process.env.ALERT_EMAIL_KEY ? { Authorization: `Bearer ${process.env.ALERT_EMAIL_KEY}` } : {}) },
        body: JSON.stringify({ to: process.env.ALERT_EMAIL_TO, subject: `ContentOS: ${toSend.length} alert(s)`, body: text })
      })
      if (res.ok) channels.push('email')
    } catch { /* best-effort */ }
  }

  return {
    dispatched: channels.length ? toSend.length : 0,
    channels,
    skipped: channels.length ? '' : 'no external channel configured (set ALERT_WEBHOOK_URL or ALERT_EMAIL_WEBHOOK_URL)'
  }
}

/** True when at least one external alert channel is configured. */
export function hasAlertChannel() {
  return !!(process.env.ALERT_WEBHOOK_URL || (process.env.ALERT_EMAIL_WEBHOOK_URL && process.env.ALERT_EMAIL_TO))
}
