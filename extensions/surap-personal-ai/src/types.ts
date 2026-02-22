export type SurapPersonalAiConfig = {
  enabled?: boolean;
  tokenOptimization?: {
    enabled?: boolean;
    channelBudgets?: Record<string, number>;
    prependPreferenceLimit?: number;
    prependTaskLimit?: number;
  };
  modelRouting?: {
    enabled?: boolean;
    small?: { provider?: string; model?: string };
    large?: { provider?: string; model?: string };
    complexityThreshold?: number;
    forceLargeKeywords?: string[];
  };
};

export type TokenBudgetPolicy = {
  defaultBudget: number;
  byChannel: Record<string, number>;
  prependPreferenceLimit: number;
  prependTaskLimit: number;
};

export type RoutingModels = {
  small?: { provider?: string; model?: string };
  large?: { provider?: string; model?: string };
  complexityThreshold: number;
  forceLargeKeywords: string[];
};

export type PreferenceMemoryItem = {
  id: string;
  key: string;
  value: string;
  confidence: number;
  importance: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  source?: string;
  tags?: string[];
};

export type TaskItem = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  dueAt?: string;
  nextAction?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type DailySummaryItem = {
  date: string;
  createdAt: number;
  content: string;
  taskIds: string[];
  preferenceIds: string[];
};

export type SkillLifecycle = "draft" | "testing" | "enabled" | "deprecated";

export type SkillRegistryItem = {
  id: string;
  version: string;
  status: SkillLifecycle;
  description?: string;
  permissions?: {
    channels?: string[];
    users?: string[];
    unsafe?: boolean;
  };
  createdAt: number;
  updatedAt: number;
};

export type PersonalAiMetricsEvent =
  | {
      type: "message_received";
      at: number;
      channelId: string;
      contentLength: number;
      conversationId?: string;
    }
  | {
      type: "model_route";
      at: number;
      sessionKey?: string;
      complexity: number;
      selectedLane: "small" | "large" | "noop";
      providerOverride?: string;
      modelOverride?: string;
      reason: string;
    }
  | {
      type: "prompt_context";
      at: number;
      sessionKey?: string;
      channelId?: string;
      preferenceCount: number;
      taskCount: number;
      charCount: number;
    }
  | {
      type: "llm_usage";
      at: number;
      sessionKey?: string;
      provider: string;
      model: string;
      usage?: {
        input?: number;
        output?: number;
        total?: number;
        cacheRead?: number;
        cacheWrite?: number;
      };
    }
  | {
      type: "compaction";
      at: number;
      phase: "before" | "after";
      sessionKey?: string;
      messageCount: number;
      compactedCount?: number;
      tokenCount?: number;
    }
  | {
      type: "tool_call";
      at: number;
      sessionKey?: string;
      toolName: string;
      success: boolean;
      durationMs?: number;
    };
