export interface BrandKitPluginConfig {
  authtoken: string;
  organizationUid: string;
  brandKitUid?: string;
  baseUrl?: string;
  knowledgeVaultBaseUrl?: string;
}

export interface BrandKit {
  uid: string;
  name: string;
  description?: string;
  api_keys?: string[];
  organization_uid: string;
  created_at?: string;
  updated_at?: string;
}

export interface GuidelinesContent {
  global_prompt?: string;
  primary_prompt?: string;
  secondary_prompts?: string[];
  voice_profile_context?: string;
  knowledge_vault_context?: string;
  user_context?: string;
}

export interface BehaviorSettings {
  allowed_topics?: string[];
  blocked_topics?: string[];
  triggers?: string[];
  knowledge_vault_sources?: string[];
}

export interface AgentGuideline {
  uid: string;
  name: string;
  guidelines?: GuidelinesContent;
  behavior_settings?: BehaviorSettings;
}

export interface VoiceProfile {
  uid: string;
  brand_kit_uid: string;
  name: string;
  description?: string;
  source_type?: string;
}

export interface IngestPayload {
  content: string;
  title?: string;
}

export interface IngestResponse {
  message: string;
  content: {
    task_id: string;
    path: string;
    folder_name: string;
    uid: string;
    tokens: {
      count: number;
      remaining: number;
    };
  };
}

export interface BrandKitMethods {
  list(): Promise<BrandKit[]>;
  get(brandKitUid: string): Promise<BrandKit>;
  listGuidelines(brandKitUid: string): Promise<AgentGuideline[]>;
  getResolvedGuidelines(brandKitUid: string, guidelineUid: string): Promise<AgentGuideline>;
  listVoiceProfiles(brandKitUid: string): Promise<VoiceProfile[]>;
  getVoiceProfile(brandKitUid: string, profileUid: string): Promise<VoiceProfile>;
}

export interface SearchParams {
  content: string;
  limit?: number;
  threshold?: number;
  folder_uids?: string[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  documents: SearchResult[];
  metrics: Record<string, unknown>;
}

export interface KVContentMetadata {
  title: string;
  data_source: string;
  tokens: number;
}

export interface KVContent {
  content_uid: string;
  content: string;
  deleted_at: boolean;
  organization_uid: string;
  brand_kit_uid: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  _metadata: KVContentMetadata;
  type: string;
  path: string;
}

export interface ListContentResponse {
  documents: KVContent[];
}

export interface ListContentOptions {
  skip?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  typeahead?: string;
}

export interface KnowledgeVaultMethods {
  ingest(payload: IngestPayload): Promise<IngestResponse>;
  search(params: SearchParams): Promise<SearchResponse>;
  hybridSearch(params: SearchParams): Promise<SearchResponse>;
  listContent(options?: ListContentOptions): Promise<ListContentResponse>;
  getContent(contentUid: string): Promise<KVContent>;
  updateContent(contentUid: string, payload: IngestPayload): Promise<unknown>;
  deleteContent(contentUid: string): Promise<unknown>;
}

export interface BrandKitPlugin {
  brandKit: BrandKitMethods;
  knowledgeVault: KnowledgeVaultMethods;
}
