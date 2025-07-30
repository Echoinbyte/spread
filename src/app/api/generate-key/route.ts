import { NextRequest, NextResponse } from "next/server";
import { createApiKeyForSpread } from "@/app/api/_utils/api-keys";
import { getRawRegistryFromGithub } from "@/utils/github";

interface KeyRequest {
  spreadName: string;
}

interface Registry {
  spreads: {
    [key: string]: {
      spread: string;
      versions: string[];
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: KeyRequest = await request.json();
    const { spreadName } = body;

    if (
      !spreadName ||
      typeof spreadName !== "string" ||
      spreadName.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid spread name",
          message: "A valid spread name is required",
        },
        { status: 400 }
      );
    }

    const spreadNameRegex = /^(?:@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+$/;
    if (!spreadNameRegex.test(spreadName)) {
      return NextResponse.json(
        {
          error: "Invalid spread name format",
          message:
            "Spread name can only contain letters, numbers, hyphens, and underscores, optionally prefixed with @author/",
        },
        { status: 400 }
      );
    }

    try {
      const registry: Registry = await getRawRegistryFromGithub();

      if (registry && registry.spreads) {
        const [authorPrefix] = spreadName.includes("/")
          ? spreadName.split("/")
          : [null];

        if (authorPrefix) {
          const existingAuthorSpreads = Object.keys(registry.spreads).filter(
            (s) => s.startsWith(`${authorPrefix}/`)
          );
          if (existingAuthorSpreads.length > 0) {
          } else {
            if (registry.spreads[spreadName]) {
              return NextResponse.json(
                {
                  error: "Spread name already exists",
                  message: `The spread name '${spreadName}' is already registered. Each spread name can only have one API key to prevent naming conflicts. If you lost your API key, please contact support for assistance.`,
                  existingSpread: {
                    name: spreadName,
                    spread: registry.spreads[spreadName].spread,
                    versions: registry.spreads[spreadName].versions,
                  },
                },
                { status: 409 }
              );
            }
          }
        } else {
          if (registry.spreads[spreadName]) {
            return NextResponse.json(
              {
                error: "Spread name already exists",
                message: `The spread name '${spreadName}' is already registered. Each spread name can only have one API key to prevent naming conflicts. If you lost your API key, please contact support for assistance.`,
                existingSpread: {
                  name: spreadName,
                  spread: registry.spreads[spreadName].spread,
                  versions: registry.spreads[spreadName].versions,
                },
              },
              { status: 409 }
            );
          }
        }
      }
    } catch (e) {
      console.error("Error fetching registry:", e);
      // ignore error
    }

    const apiKey = createApiKeyForSpread(spreadName);

    return NextResponse.json({
      success: true,
      spreadName,
      apiKey,
      message: `API key generated for spread: ${spreadName}`,
      instructions: [
        `Use this API key to register your spread: ${spreadName}`,
        `Command: npx spread registry -r -s ${spreadName} -k ${apiKey}`,
        "Keep this API key secure - it can only be used for this specific spread name",
        "You can use the same key to update versions of your spread",
      ],
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to generate API key",
      },
      { status: 500 }
    );
  }
}
