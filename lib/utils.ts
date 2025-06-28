export function uInt8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function arrayBufferToBase64(arrayBuffer: BufferSource): string {
  const buffer =
    arrayBuffer instanceof ArrayBuffer
      ? arrayBuffer
      : arrayBuffer.buffer.slice(
          arrayBuffer.byteOffset,
          arrayBuffer.byteOffset + arrayBuffer.byteLength
        );
  const bytes = new Uint8Array(buffer);
  return uInt8ArrayToBase64(bytes);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function base64ToUint8Array(base64: string) {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
