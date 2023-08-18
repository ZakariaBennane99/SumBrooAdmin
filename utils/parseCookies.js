// utils/parseCookies.js
import { parse } from 'cookie';  // Import 'parse' instead of 'serialize'

export const parseCookies = (cookieHeader) => {
  return parse(cookieHeader || '');
};