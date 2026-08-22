/**
 * Typed shape for the notification events in PITLANE_MASTER_PROMPT.md §9.
 *
 * NOT wired to a real provider. Sending real push/SMS/WhatsApp/email
 * requires Resend, Twilio and FCM credentials, and those calls must run
 * server-side (a Supabase Edge Function triggered from the DB) — never
 * from the browser, since that's the only way to keep the provider API
 * keys off the client. This file is the contract client code can build
 * against once that Edge Function exists; today it only logs.
 */
export type NotificationChannel = 'push' | 'sms' | 'whatsapp' | 'email'

export type NotificationTemplate =
  | 'maint_due'
  | 'km_check'
  | 'service_preloaded'
  | 'transfer_code'
  | 'vehicle_claimed'
  | 'dictionary_approved'

export interface NotificationEvent {
  channel: NotificationChannel
  recipientId: string
  template: NotificationTemplate
  data: Record<string, string>
}

export async function sendNotification(event: NotificationEvent): Promise<void> {
  console.info('[notifications] stub — would send via', event.channel, event)
}
