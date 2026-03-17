import { MongoStorageAdapter } from "../../adapters/storage/MongoStorageAdapter.js";

export { type IStorageAdapter, type CategoryInfo } from "../../adapters/storage/IStorageAdapter.js";

export const storageAdapter = new MongoStorageAdapter();
