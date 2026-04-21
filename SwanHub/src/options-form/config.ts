// Types matching the structure of the options_form_config YAML file.

type NonEmptyArray<T> = [T, ...T[]];

type ResourceProfileType = "general" | "cuda" | "nxcals" | "customenv" | "lhcb" | "dev";
type LcgCategoryType = "recommended" | "development" | "lhcb" | "legacy";

export interface LcgRelease {
  value: string;
  label: string;
  profile: ResourceProfileType;
  platform: string;
}

interface LcgCategory {
  label: string;
  releases: NonEmptyArray<LcgRelease>;
}

export interface ValueLabel {
  value: string;
  label: string;
}

export interface ResourceProfile {
  cores: NonEmptyArray<number>;
  memory: NonEmptyArray<number>;
  clusters: NonEmptyArray<ValueLabel>;
  condor: NonEmptyArray<ValueLabel>;
}

interface Builder {
  value: string;
  label: string;
}

interface RucioRse {
  value: string;
  mount_path: string;
  path_begins_at: number;
}

interface RucioInstance {
  value: string;
  label: string;
  rse_options: RucioRse[];
}

export interface FormConfig {
  lcg_releases: Record<LcgCategoryType, LcgCategory>;
  resource_profiles: Record<ResourceProfileType, ResourceProfile>;
  custom_environments: { builders: NonEmptyArray<Builder> };
  rucio?: { instances: RucioInstance[] };
}

export interface DynamicFormInfo {
  gpu_flavours?: string[];
  free_gpu_flavours?: string[];
}
