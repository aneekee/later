export interface BaseSuccessResponse<T = undefined> {
  message: string;
  data?: T;
}

export interface SuccessListResponse<T> extends BaseSuccessResponse<{
  list: T[];
  page: number;
  pageSize: number;
  totalSize: number;
}> {}
