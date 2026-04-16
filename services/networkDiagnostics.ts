export function describeError(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function buildNetworkErrorMessage(
  label: string,
  url: string,
  err: unknown
) {
  const details = describeError(err).trim();
  return details ? `${label} failed at ${url}: ${details}` : `${label} failed at ${url}`;
}
