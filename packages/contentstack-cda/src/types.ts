export interface ContentstackCdaConfig {
  apiKey: string;
  deliveryToken: string;
  environment: string;
  baseUrl?: string;
}

export interface CdaContentType {
  uid: string;
  title: string;
  description: string;
}

export interface CdaEntry {
  uid: string;
  title: string;
  url?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ContentstackCdaPlugin {
  getContentTypes(): Promise<CdaContentType[]>;
  getEntries(
    contentTypeUid: string,
    opts?: {
      limit?: number;
      query?: string;
      include_count?: boolean;
    }
  ): Promise<{ entries: CdaEntry[]; count?: number }>;
  getEntry(contentTypeUid: string, entryUid: string): Promise<CdaEntry>;
}
