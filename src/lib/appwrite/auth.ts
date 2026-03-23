import config from "./config";
import { Client, Account, ID, Models } from "appwrite";

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
  private client: Client | null = null;
  private account: Account | null = null;

  private getAccount(): Account {
    if (!this.account) {
      this.client = new Client()
        .setEndpoint(config.appwriteUrl)
        .setProject(config.appwriteProjectId);
      this.account = new Account(this.client);
    }
    return this.account;
  }

  async createAccount({
    email,
    password,
    name,
  }: CreateAccountParams): Promise<
    Models.Session | Models.User<Models.Preferences>
  > {
    try {
      const userAccount = await this.getAccount().create(
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
      console.log("AuthService :: createAccount :: error", error);
      throw error;
    }
  }

  async login({ email, password }: LoginParams): Promise<Models.Session> {
    try {
      return await this.getAccount().createEmailPasswordSession(
        email,
        password,
      );
    } catch (error) {
      console.log("AuthService :: login :: error", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      const session = await this.getAccount().getSession("current");
      if (session) {
        return await this.getAccount().get();
      }
      return null;
    } catch (error: unknown) {
      const err = error as { code?: number; type?: string };
      if (err.code === 401 || err.type === "general_unauthorized_scope") {
        return null;
      }
      console.log("AuthService :: getCurrentUser :: error", error);
      return null;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    try {
      await this.getAccount().deleteSessions();
      return { success: true };
    } catch (error) {
      console.log("AuthService :: logout :: error", error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
