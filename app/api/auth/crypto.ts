const encoder = new TextEncoder();

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = encoder.encode(password + salt);
  const hash = await crypto.subtle.digest('SHA-512', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
