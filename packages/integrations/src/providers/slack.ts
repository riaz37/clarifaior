import { BaseIntegration, IntegrationResponse } from "../base/integration";
import { SlackCredentials, SlackMessage } from "../types";

export class SlackIntegration extends BaseIntegration {
  private credentials: SlackCredentials;

  constructor(config: any) {
    super(config);
    this.credentials = config.credentials as SlackCredentials;
  }

  async authenticate(): Promise<IntegrationResponse<boolean>> {
    try {
      const response = await fetch("https://slack.com/api/auth.test", {
        headers: {
          Authorization: `Bearer ${this.credentials.botToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return {
        success: data.ok,
        data: data.ok,
        error: data.ok ? undefined : data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  async execute(action: string, params: any): Promise<IntegrationResponse> {
    switch (action) {
      case "sendMessage":
        return this.sendMessage(params as SlackMessage);
      case "getChannels":
        return this.getChannels();
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  async testConnection(): Promise<IntegrationResponse<boolean>> {
    return this.authenticate();
  }

  private async sendMessage(
    message: SlackMessage
  ): Promise<IntegrationResponse> {
    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.credentials.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: message.channel,
          text: message.text,
          username: message.username,
          icon_emoji: message.iconEmoji,
        }),
      });

      const data = await response.json();
      return {
        success: data.ok,
        data: data.ok ? data.message : undefined,
        error: data.ok ? undefined : data.error,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send message",
      };
    }
  }

  private async getChannels(): Promise<IntegrationResponse> {
    try {
      const response = await fetch("https://slack.com/api/conversations.list", {
        headers: {
          Authorization: `Bearer ${this.credentials.botToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return {
        success: data.ok,
        data: data.ok ? data.channels : undefined,
        error: data.ok ? undefined : data.error,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get channels",
      };
    }
  }
}
