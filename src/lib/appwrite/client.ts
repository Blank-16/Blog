import { Client, Databases, Storage } from "appwrite";
import config from "./config";

let client: Client | null = null;
let databases: Databases | null = null;
let storage: Storage | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(config.appwriteUrl)
      .setProject(config.appwriteProjectId);
  }
  return client;
}

export function getDatabases(): Databases {
  if (!databases) {
    databases = new Databases(getClient());
  }
  return databases;
}

export function getStorage(): Storage {
  if (!storage) {
    storage = new Storage(getClient());
  }
  return storage;
}
