import { IUser } from './user.interface.js';
import { IUserRole } from './role.interface.js';

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

export interface IAuthMeResponse {
  user: IUser;
  roles: IUserRole[];
}
