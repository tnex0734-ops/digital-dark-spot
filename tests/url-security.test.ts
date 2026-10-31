import { describe, expect, it } from "vitest";
import { isPublicIpAddress, resolvePublicTarget, validateResearchUrl } from "@/lib/research/url-research";

describe("URL review safety boundaries", () => {
  it("accepts ordinary public addresses and rejects private, link-local, reserved and metadata ranges", () => {
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("2606:4700:4700::1111")).toBe(true);
    for (const address of ["0.0.0.0", "10.1.2.3", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "192.0.2.4", "198.18.0.1", "203.0.113.4", "224.0.0.1"]) {
      expect(isPublicIpAddress(address), address).toBe(false);
    }
    for (const address of ["::", "::1", "fc00::1", "fe80::1", "2001:db8::1", "2002::1", "3fff::1", "::ffff:169.254.169.254"]) {
      expect(isPublicIpAddress(address), address).toBe(false);
    }
  });

  it("requires a public HTTPS hostname without credentials or a non-standard port", () => {
    expect(validateResearchUrl("https://example.org/policy").hostname).toBe("example.org");
    for (const value of ["http://example.org", "https://user:pass@example.org", "https://localhost", "https://127.0.0.1", "https://example.org:8443", "not a URL"]) {
      expect(() => validateResearchUrl(value), value).toThrow();
    }
  });

  it("rejects a hostname if even one resolved destination is not public", async () => {
    const records = [{ address: "8.8.8.8", family: 4 as const }, { address: "10.1.2.3", family: 4 as const }];
    await expect(resolvePublicTarget("example.org", async () => records)).rejects.toThrow("non-public");
    await expect(resolvePublicTarget("example.org", async () => [{ address: "1.1.1.1", family: 4 as const }])).resolves.toEqual({ address: "1.1.1.1", family: 4 });
  });
});
