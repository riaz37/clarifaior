import { BaseIntegration, IntegrationConfig } from "./integration";
import { SlackIntegration } from "../providers/slack";
import { IntegrationType } from "../types";

export class IntegrationFactory {
  static create(
    type: IntegrationType,
    config: IntegrationConfig
  ): BaseIntegration {
    switch (type) {
      case "slack":
        return new SlackIntegration(config);
      case "gmail":
        throw new Error("Gmail integration not yet implemented");
      case "notion":
        throw new Error("Notion integration not yet implemented");
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  static getSupportedTypes(): IntegrationType[] {
    return ["slack", "gmail", "notion"];
  }

  static isSupported(type: string): boolean {
    return this.getSupportedTypes().includes(type as IntegrationType);
  }
}
