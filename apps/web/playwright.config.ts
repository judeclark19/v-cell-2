import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: "http://127.0.0.1:3007",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run start:test",
    url: "http://127.0.0.1:3007/game",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"]
      }
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"]
      }
    }
  ]
});
