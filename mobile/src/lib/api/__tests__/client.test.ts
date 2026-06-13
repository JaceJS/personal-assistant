import { apiFetch } from "../client";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) } },
}));

jest.mock("@/stores/auth", () => ({
  useAuthStore: { getState: () => ({ session: { access_token: "test-token" } }) },
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock("@/constants/config", () => ({
  API_URL: "http://localhost:8000",
  API_TIMEOUT_MS: 10000,
}));

describe("apiFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves undefined for 204 No Content without calling .json()", async () => {
    const mockJson = jest.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: mockJson,
      text: jest.fn(),
    } as unknown as Response);

    const result = await apiFetch<void>("/api/v1/categories/some-id", { method: "DELETE" });

    expect(result).toBeUndefined();
    expect(mockJson).not.toHaveBeenCalled();
  });

  it("returns parsed JSON for 200 responses", async () => {
    const data = { data: { id: "1", name: "Food" } };
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(data),
      text: jest.fn(),
    } as unknown as Response);

    const result = await apiFetch<typeof data>("/api/v1/categories/1");

    expect(result).toEqual(data);
  });

  it("throws ApiError for non-ok responses", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValueOnce("Forbidden"),
      json: jest.fn(),
    } as unknown as Response);

    await expect(apiFetch("/api/v1/categories/1")).rejects.toMatchObject({
      status: 403,
    });
  });
});
