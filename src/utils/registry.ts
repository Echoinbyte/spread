import { getRegistryFromGithub, updateRegistryOnGithub } from "./github.js";

const REGISTRY_PATH = "registry.json";

export const getRegistry = async () => {
  const registryData = await getRegistryFromGithub();
  if (!registryData || !registryData.content) {
    return null;
  }
  return registryData.content;
};

export const updateRegistry = async (registry: object) => {
  const registryData = await getRegistryFromGithub();
  if (!registryData || !registryData.sha) {
    return null;
  }
  return await updateRegistryOnGithub(registry, registryData.sha);
};