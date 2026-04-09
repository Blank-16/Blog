import { Account, ID, Models } from 'appwrite';
import { getClient } from './client';

interface CreateAccountParams {
  email: string;
  password: string;
  name: string;
}

interface LoginParams {
  email: string;
  password: string;
}

export class AuthService {
  private get account(): Account {
    return new Account(getClient());
  }

  async createAccount({
    email,
    password,
    name,
  }: CreateAccountParams): Promise<Models.Session | Models.User<Models.Preferences>> {
    try {
      const userAccount = await this.account.create(ID.unique(), email, password, name);
      if (userAccount) {
        return this.login({ email, password });
      }
      return userAccount;
    } catch (error) {
      console.error('AuthService :: createAccount :: error', error);
      throw error;
    }
  }

  async login({ email, password }: LoginParams): Promise<Models.Session> {
    try {
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error('AuthService :: login :: error', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      const session = await this.account.getSession('current');
      if (session) {
        return await this.account.get();
      }
      return null;
    } catch (error: unknown) {
      const err = error as { code?: number; type?: string };
      if (err.code === 401 || err.type === 'general_unauthorized_scope') {
        return null;
      }
      console.error('AuthService :: getCurrentUser :: error', error);
      return null;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    try {
      await this.account.deleteSessions();
      return { success: true };
    } catch (error) {
      console.error('AuthService :: logout :: error', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
