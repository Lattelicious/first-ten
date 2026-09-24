import { AppError } from "./env";

/** Bound streamed requests too; Content-Length is not a trustworthy limit. */
export async function boundedRequest(request: Request, maximum: number) {
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) {
      await reader.cancel();
      throw new AppError("This request is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bytes.buffer,
  });
}
