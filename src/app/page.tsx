"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { FaRegCopy } from "react-icons/fa6";

export default function Home() {
  const [identifier, setIdentifier] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateApiKey = async () => {
    setError("");
    setApiKey("");
    setLoading(true);
    try {
      const response = await fetch("/api/generate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spreadName: identifier }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate API key");
      }

      const data = await response.json();
      setApiKey(data.apiKey);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const commands = {
    install: "npm i -g @spreadn/cli",
    init: "spread init",
    create:
      "spread create [spreadName] [description] [type] [version] [fileNames...] -k [keywords]",
    build: "spread build",
    deploy: "Deploy your project",
    registry: `spread registry -r -s ${identifier || "[SpreadName]"} -n ${
      identifier || "[SpreadNameInYourProject]"
    } -k ${apiKey || "[SpreadKey]"}`,
    update:
      "Since, the same key is used for updates, you can simply run the registry command again",
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white">
      <div className="grid grid-cols-1 gap-8 w-full max-w-5xl p-8">
        <section className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Generate Spread Key</h2>
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Enter identifier (e.g., project name)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  generateApiKey();
                }
              }}
              className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <Button
              onClick={generateApiKey}
              disabled={loading || !identifier}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Generate Key"}
            </Button>
            {error && (
              <div className="p-3 bg-red-900 text-white rounded-md">
                <p>Error: {error}</p>
              </div>
            )}
          </div>
          {apiKey && (
            <div className="mt-4 p-3 bg-gray-800 rounded-md break-words">
              <p className="font-mono text-green-400">
                Spread Key: <span className="select-all">{apiKey}</span>
              </p>
            </div>
          )}
        </section>

        <section className="p-6">
          <h2 className="text-2xl font-semibold mb-4">How to Use Spread</h2>
          <ul className="list-none text-gray-300 space-y-2">
            {Object.entries(commands).map(([key, value]) => (
              <li key={key} className="flex justify-between items-center">
                <code className="bg-gray-800 p-1 rounded">{value}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(value);
                    toast.success("Copied to clipboard!");
                  }}
                >
                  <FaRegCopy />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Toaster />
    </main>
  );
}
