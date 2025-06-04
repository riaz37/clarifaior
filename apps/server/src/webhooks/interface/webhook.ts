export interface WebhookTriggerData {
  method: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
