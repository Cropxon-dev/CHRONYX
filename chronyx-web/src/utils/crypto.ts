// Client-side encryption utilities using Web Crypto API

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

// Derive a key from password using PBKDF2
export const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt file data
export const encryptFile = async (
  file: File, 
  password: string
): Promise<{ encryptedBlob: Blob; metadata: EncryptedFileMetadata }> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);
  
  const arrayBuffer = await file.arrayBuffer();
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer
  );
  
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(encryptedData), SALT_LENGTH + IV_LENGTH);
  
  return {
    encryptedBlob: new Blob([combined], { type: "application/encrypted" }),
    metadata: {
      originalName: file.name,
      originalType: file.type,
      originalSize: file.size,
      encrypted: true,
    },
  };
};

// Decrypt file data
export const decryptFile = async (
  encryptedBlob: Blob, 
  password: string,
  metadata: EncryptedFileMetadata
): Promise<Blob> => {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const combined = new Uint8Array(arrayBuffer);
  
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH);
  
  const key = await deriveKey(password, salt);
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );
  
  return new Blob([decryptedData], { type: metadata.originalType });
};

export interface EncryptedFileMetadata {
  originalName: string;
  originalType: string;
  originalSize: number;
  encrypted: boolean;
}

// Hash password for folder locking
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
