import { afterEach, describe, expect, it } from "vitest";

import { getAutoLockConfig, validateConfig } from "./config";

const originalEnv = { TZ: process.env.TZ, AUTO_LOCK_TIME: process.env.AUTO_LOCK_TIME };

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("validateConfig", () => {
  it("accepts a valid TZ and AUTO_LOCK_TIME and summarises them", () => {
    const { errors, summary } = validateConfig({ TZ: "Asia/Taipei", AUTO_LOCK_TIME: "23:00" });
    expect(errors).toEqual([]);
    expect(summary).toContain("TZ=Asia/Taipei");
    expect(summary).toContain("AUTO_LOCK_TIME=23:00");
  });

  it("treats unset or empty values as unset", () => {
    expect(validateConfig({}).errors).toEqual([]);
    expect(validateConfig({ TZ: "", AUTO_LOCK_TIME: " " }).errors).toEqual([]);
    expect(validateConfig({}).summary).toContain("AUTO_LOCK_TIME=off");
  });

  it("lists every problem at once", () => {
    const { errors } = validateConfig({ TZ: "Mars/Base", AUTO_LOCK_TIME: "25:00" });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("TZ");
    expect(errors[1]).toContain("AUTO_LOCK_TIME");
  });

  it.each(["23", "23:0", "24:00", "11pm", "23:00:00"])("rejects AUTO_LOCK_TIME %s", (value) => {
    expect(validateConfig({ AUTO_LOCK_TIME: value }).errors).toHaveLength(1);
  });

  it("rejects a CRON_SECRET equal to ADMIN_API_KEY", () => {
    const { errors } = validateConfig({ CRON_SECRET: "same", ADMIN_API_KEY: "same" });
    expect(errors).toEqual([expect.stringContaining("CRON_SECRET")]);
    expect(validateConfig({ CRON_SECRET: "cron", ADMIN_API_KEY: "admin" }).errors).toEqual([]);
  });

  it("warns when AUTO_LOCK_TIME is set without CRON_SECRET", () => {
    expect(validateConfig({ AUTO_LOCK_TIME: "23:00" }).warnings).toEqual([expect.stringContaining("CRON_SECRET")]);
    expect(validateConfig({ AUTO_LOCK_TIME: "23:00", CRON_SECRET: "cron" }).warnings).toEqual([]);
    expect(validateConfig({}).warnings).toEqual([]);
  });
});

describe("getAutoLockConfig", () => {
  it("is null (disabled) when AUTO_LOCK_TIME is unset", () => {
    delete process.env.AUTO_LOCK_TIME;
    expect(getAutoLockConfig()).toBeNull();
  });

  it("parses HH:mm, with or without a leading zero, in the server zone", () => {
    process.env.TZ = "Asia/Taipei";
    process.env.AUTO_LOCK_TIME = "7:05";
    expect(getAutoLockConfig()).toEqual({ hour: 7, minute: 5, timeZone: "Asia/Taipei" });
  });
});
