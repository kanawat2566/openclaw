import { appendJsonlLine } from "./json-store.js";
import type { PersonalAiMetricsEvent } from "./types.js";

export class MetricsWriter {
  constructor(private readonly filePath: string) {}

  async write(event: PersonalAiMetricsEvent): Promise<void> {
    await appendJsonlLine(this.filePath, event);
  }
}
