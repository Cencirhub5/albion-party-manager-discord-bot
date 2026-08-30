import { CommandResponse } from '../types/response.js';

/**
 * Başarılı işlem yanıtı üretir
 */
export function successResponse<T>(data?: T): CommandResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Hatalı işlem yanıtı üretir
 */
export function errorResponse<T = never>(error: string, data?: T): CommandResponse<T> {
  return {
    success: false,
    error,
    data,
  };
}
