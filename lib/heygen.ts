/**
 * Server-side HeyGen helper.
 * Creates a short-lived streaming session token so the raw API key
 * never reaches the browser.
 */
export async function createHeyGenSessionToken(): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error("HEYGEN_API_KEY is not set");

  const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen token request failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error("HeyGen token response missing token field");
  return token;
}
