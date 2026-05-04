import { Account, ID, Models } from "appwrite";
import { getClient } from "./client";

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
  private _account: Account | null = null;

  private get account(): Account {
    if (!this._account) this._account = new Account(getClient());
    return this._account;
  }

  async createAccount({
    email,
    password,
    name,
  }: CreateAccountParams): Promise<
    Models.Session | Models.User<Models.Preferences>
  > {
    try {
      const userAccount = await this.account.create(
        ID.unique(),
        email,
        password,
        name,
      );
      if (userAccount) {
        return this.login({ email, password });
      }
      return userAccount;
    } catch (error) {
      console.error("AuthService :: createAccount :: error", error);
      throw error;
    }
  }

  async login({ email, password }: LoginParams): Promise<Models.Session> {
    try {
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error("AuthService :: login :: error", error);
      throw error;
    }
  }

  /**
   * Returns the current user or null if no active session exists.
   * A single get() call is sufficient - Appwrite throws a 401 when there
   * is no session, which we catch and convert to null. The previous pattern
   * of calling getSession() first was an unnecessary extra round trip.
   */
  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await this.account.get();
    } catch (error: unknown) {
      const err = error as { code?: number; type?: string };
      if (err.code === 401 || err.type === "general_unauthorized_scope") {
        return null;
      }
      console.error("AuthService :: getCurrentUser :: error", error);
      return null;
    }
  }

  async updateName(name: string): Promise<Models.User<Models.Preferences>> {
    try {
      return await this.account.updateName(name);
    } catch (error) {
      console.error("AuthService :: updateName :: error", error);
      throw error;
    }
  }

  async updateEmail(
    email: string,
    password: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      return await this.account.updateEmail(email, password);
    } catch (error) {
      console.error("AuthService :: updateEmail :: error", error);
      throw error;
    }
  }

  async updatePassword(
    newPassword: string,
    currentPassword: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      return await this.account.updatePassword(newPassword, currentPassword);
    } catch (error) {
      console.error("AuthService :: updatePassword :: error", error);
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      // Appwrite does not expose a direct "delete account" endpoint on the
      // client SDK — the standard pattern is to delete all sessions (logout)
      // then call a server-side Function or the Management API. For now we
      // delete all sessions so the account is effectively deactivated from
      // the user's perspective. Wire to an Appwrite Function for hard delete.
      await this.account.deleteSessions();
    } catch (error) {
      console.error("AuthService :: deleteAccount :: error", error);
      throw error;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    try {
      await this.account.deleteSessions();
      return { success: true };
    } catch (error) {
      console.error("AuthService :: logout :: error", error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
