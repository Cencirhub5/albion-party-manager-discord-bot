/**
 * Standart Komut ve Servis Yanıt Yapısı
 * GEMINI.md Mimari Kuralı: Tüm yanıtlar bu formatta sarmalanmalıdır.
 */
export interface CommandResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
