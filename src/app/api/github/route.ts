import { NextResponse } from 'next/server';
import axios, { AxiosInstance } from "axios";

const GITHUB_API_URL = "https://api.github.com";

let _octokit: AxiosInstance;
let _REPO_OWNER: string | undefined;
let _REPO_NAME: string | undefined;

function _ensureInitialized() {
  if (!_octokit || !_REPO_OWNER || !_REPO_NAME) {
    const GITHUB_TOKEN = process.env.SPREAD_GITHUB_TOKEN;
    _REPO_OWNER = process.env.SPREAD_REPO_OWNER || "Enfiniq";
    _REPO_NAME = process.env.SPREAD_REPO_NAME || "Spread-Registry";

    if (!GITHUB_TOKEN || !_REPO_OWNER || !_REPO_NAME) {
      throw new Error("GitHub token or repository details are not configured.");
    }

    _octokit = axios.create({
      baseURL: GITHUB_API_URL,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  }
}

const getFile = async (path: string) => {
  _ensureInitialized();
  try {
    const response = await _octokit.get(
      `/repos/${_REPO_OWNER}/${_REPO_NAME}/contents/${path}`
    );
    return response.data;
  } catch (e) {
    return null;
  }
};

const updateFile = async (
  path: string,
  content: string,
  sha: string
) => {
  _ensureInitialized();
  try {
    const response = await _octokit.put(
      `/repos/${_REPO_OWNER}/${_REPO_NAME}/contents/${path}`,
      {
        message: `Update ${path}`,
        content: Buffer.from(content).toString("base64"),
        sha,
      }
    );
    return response.data;
  } catch (e) {
    throw e;
  }
};

const CENTRAL_REGISTRY_PATH = "registry.json";

export async function GET(request: Request) {
  _ensureInitialized();
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'getRegistry') {
      const file = await getFile(CENTRAL_REGISTRY_PATH);
      if (!file) {
        return NextResponse.json({ error: "Registry not found" }, { status: 404 });
      }
      const content = Buffer.from(file.content, "base64").toString();
      return NextResponse.json({ content: JSON.parse(content), sha: file.sha });
    } else if (action === 'getRawRegistry') {
      const rawContentUrl = `https://raw.githubusercontent.com/${_REPO_OWNER}/${_REPO_NAME}/main/${CENTRAL_REGISTRY_PATH}`;
      const response = await axios.get(rawContentUrl);
      return NextResponse.json(response.data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  _ensureInitialized();
  try {
    const { action, registry, sha } = await request.json();

    if (action === 'updateRegistry') {
      if (!registry || !sha) {
        return NextResponse.json({ error: "Missing registry or sha" }, { status: 400 });
      }
      const content = JSON.stringify(registry, null, 2);
      const response = await updateFile(CENTRAL_REGISTRY_PATH, content, sha);
      return NextResponse.json(response);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
