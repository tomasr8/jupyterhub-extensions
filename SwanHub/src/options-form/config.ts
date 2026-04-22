// Schema types for the options_form_config YAML file.
// These mirror the structure consumed at runtime and act as executable
// documentation of the YAML schema. When the schema changes, update these
// types; the compiler will point at every consumer that needs updating.

export interface LcgRelease {
  value: string;
  label?: string;
  profile: string;
  platform: string;
}

export interface LcgCategory {
  label: string;
  releases: LcgRelease[];
}

export interface ValueLabel {
  value: string;
  label: string;
}

export interface ResourceProfile {
  cores: number[];
  memory: number[];
  clusters?: ValueLabel[];
  condor?: ValueLabel[];
}

export interface Builder {
  value: string;
  label?: string;
  profile: string;
}

export interface RucioRse {
  value: string;
  mount_path: string;
  path_begins_at: number;
}

export interface RucioInstance {
  value: string;
  label: string;
  rse_options: RucioRse[];
}

export interface FeatureFlags {
  custom_environments?: boolean;
  generate_url?: boolean;
  technical_network?: boolean;
}

export interface FormConfig {
  lcg_releases: Record<string, LcgCategory>;
  resource_profiles: Record<string, ResourceProfile>;
  custom_environments?: { builders: Builder[] };
  rucio?: { instances: RucioInstance[] };
  features?: FeatureFlags;
}

export interface DynamicFormInfo {
  gpu_flavours?: string[];
  free_gpu_flavours?: string[];
}

export interface Domains {
  general: string;
  ats: string;
}

// Aggregated data the server injects via a <script type="application/json"> tag.
export interface ServerData {
  config: FormConfig;
  dynamic: DynamicFormInfo;
  domains: Domains;
}
