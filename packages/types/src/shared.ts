export interface BaseSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data?: T;
}
