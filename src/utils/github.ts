import axios from "axios";

const API_BASE_URL = "https://spread.neploom.com";

export async function getRegistryFromGithub() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/github?action=getRegistry`
    );
    return response.data;
  } catch (e) {
    return null;
  }
}

export async function getRawRegistryFromGithub() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/github?action=getRawRegistry`
    );
    return response.data;
  } catch (e) {
    return null;
  }
}

export async function updateRegistryOnGithub(registry: object, sha: string) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/github`, {
      action: "updateRegistry",
      registry,
      sha,
    });
    return response.data;
  } catch (e) {
    return null;
  }
}
