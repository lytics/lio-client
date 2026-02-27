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

export interface KnowledgeVaultMethods {
  ingest(payload: IngestPayload): Promise<IngestResponse>;
}

export interface BrandKitPlugin {
  brandKit: BrandKitMethods;
  knowledgeVault: KnowledgeVaultMethods;
}
