export interface BaseSuccessResponse<T = undefined> {
  message: string;
  data?: T;
}
