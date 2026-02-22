import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { registerSurapPersonalAiHooks } from "./hooks.js";
import { surapPersonalAiService } from "./service.js";

const plugin = {
  id: "surap-personal-ai",
  name: "Surap Personal AI",
  description: "Personal AI extension with token optimization and file-first state scaffolding",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerService(surapPersonalAiService);
    registerSurapPersonalAiHooks(api);
  },
};

export default plugin;
