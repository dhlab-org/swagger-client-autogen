import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export const isUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};