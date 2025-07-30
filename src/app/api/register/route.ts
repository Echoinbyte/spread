import { NextRequest, NextResponse } from "next/server";
import { validateSpreadKey } from "@/app/api/_utils/api-keys";
import { getRegistryFromGithub, updateRegistryOnGithub } from "@/utils/github";

interface RegisterRequest {
  name: string;
  spread: string;
  versions: string[];
  apiKey: string;
}

interface RegistryData {
  $schema?: string;
  spreads: {
    [spreadName: string]: {
      spread: string;
      versions: string[];
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, spread, versions, apiKey } = body;

    if (!name || !spread || !versions || !Array.isArray(versions) || !apiKey) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "name, spread, versions (array), and apiKey are required",
        },
        { status: 400 }
      );
    }

    if (!validateSpreadKey(name, apiKey)) {
      return NextResponse.json(
        {
          error: "Invalid API key",
          message: "The provided API key is not valid for this spread name",
        },
        { status: 401 }
      );
    }

    const registryFile = await getRegistryFromGithub();
    let registry: RegistryData = {
      $schema: "https://spread.neploom.com/schema/spread-registry.json",
      spreads: {},
    };
    let sha: string | undefined;

    if (registryFile) {
      registry = registryFile.content;
      sha = registryFile.sha;
    }

    registry.spreads[name] = {
      spread,
      versions: [...new Set(versions)].sort((a, b) => {
        return b.localeCompare(a, undefined, { numeric: true });
      }),
    };

    const githubUpdateResult = await updateRegistryOnGithub(registry, sha!);

    if (!githubUpdateResult) {
      return NextResponse.json(
        {
          error: "GitHub update failed",
          message: "Failed to update the centralized registry on GitHub.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${
        registry.spreads[name] ? "updated" : "registered"
      } spread: ${name}`,
      data: {
        name,
        spread,
        versions: registry.spreads[name].versions,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process registry request",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const registryFile = await getRegistryFromGithub();
    if (!registryFile) {
      return NextResponse.json(
        {
          error: "Registry not found",
          message: "Centralized registry could not be fetched.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(registryFile.content);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch registry",
      },
      { status: 500 }
    );
  }
}
