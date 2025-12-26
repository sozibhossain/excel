import env from "../config/env.js";

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (env.SMS_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.SMS_WEBHOOK_TOKEN}`;
  }
  return headers;
};

export const sendSms = async (to, message) => {
  if (!env.SMS_WEBHOOK_URL) {
    console.warn("SMS_WEBHOOK_URL is not configured. Skipping SMS notification.");
    return { status: "SKIPPED" };
  }

  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this runtime.");
  }

  const body = JSON.stringify({ to, message });

  try {
    const response = await fetch(env.SMS_WEBHOOK_URL, {
      method: "POST",
      headers: buildHeaders(),
      body,
    });

    const payload = await response
      .json()
      .catch(() => ({ status: response.status, ok: response.ok }));

    if (!response.ok) {
      throw new Error(
        `SMS provider responded with ${response.status}: ${JSON.stringify(payload)}`
      );
    }

    return {
      status: "SENT",
      providerMessageId: payload.id ?? payload.sid ?? null,
    };
  } catch (error) {
    console.error("SMS dispatch failed", error);
    return { status: "FAILED", error };
  }
};
