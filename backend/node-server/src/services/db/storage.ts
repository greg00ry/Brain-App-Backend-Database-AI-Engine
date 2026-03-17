import { MongoStorageAdapter } from "../../adapters/storage/MongoStorageAdapter.js";

export {
  type IStorageAdapter,
  type CategoryInfo,
  type EntryAnalysisData,
  type ActionTool,
  type ActionStatus,
  type SearchResultData,
  type EmailResultData,
  type CalendarResultData,
} from "../../adapters/storage/IStorageAdapter.js";

export const storageAdapter = new MongoStorageAdapter();
