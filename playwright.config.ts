import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    actionTimeout: 10000,
  },
});
