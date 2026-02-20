export interface IAuthCredentials {
  email: string;
  password: string;
}

export interface IRegisterPayload extends IAuthCredentials {
  firstName: string;
  lastName: string;
}

export interface IAuthResponse {
  access_token: string;
  refresh_token: string;
}
