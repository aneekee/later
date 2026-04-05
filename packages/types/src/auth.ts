import { BaseSuccessResponse } from "./shared";

export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface LoginSuccessResponse extends BaseSuccessResponse {}

export interface RegisterRequestBody {
  username: string;
  password: string;
}

export interface RegisterSuccessResponseData {
  id: string;
  username: string;
}

export interface RegisterSuccessResponse extends BaseSuccessResponse<RegisterSuccessResponseData> {}

export interface RefreshSuccessResponse extends BaseSuccessResponse {}

export interface LogoutSuccessResponse extends BaseSuccessResponse {}
