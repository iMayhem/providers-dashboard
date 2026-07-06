import express from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getBuiltinSources,
  getBuiltinEmbeds,
  getBuiltinExternalSources,
} from "@movie-web/providers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = process.env.CONFIG_PATH || "/data/provider-config.json";

let providerConfig = {
  sources: {},
  embeds: {},
  sourceOrder: [],
};

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      const data = readFileSync(CONFIG_PATH, "utf-8");
      providerConfig = JSON.parse(data);
    } catch (e) {
      console.error("Failed to load config:", e.message);
    }
  }
}

function saveConfig() {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(providerConfig, null, 2));
  } catch (e) {
    console.error("Failed to save config:", e.message);
  }
}

loadConfig();

const app = express();
app.use(express.json());

app.get("/api/providers", (req, res) => {
  const sources = getBuiltinSources().map((s) => ({
    id: s.id,
    name: s.name,
    rank: s.rank,
    disabled: s.disabled,
    externalSource: s.externalSource || false,
    flags: s.flags || [],
    type: "source",
    userDisabled: providerConfig.sources[s.id]?.disabled ?? false,
    userRank: providerConfig.sources[s.id]?.rank ?? s.rank,
    customName: providerConfig.sources[s.id]?.name || null,
  }));

  const externalSources = getBuiltinExternalSources().map((s) => ({
    id: s.id,
    name: s.name,
    rank: s.rank,
    disabled: s.disabled,
    externalSource: true,
    flags: s.flags || [],
    type: "source",
    userDisabled: providerConfig.sources[s.id]?.disabled ?? false,
    userRank: providerConfig.sources[s.id]?.rank ?? s.rank,
    customName: providerConfig.sources[s.id]?.name || null,
  }));

  const embeds = getBuiltinEmbeds().map((e) => ({
    id: e.id,
    name: e.name,
    rank: e.rank,
    disabled: e.disabled,
    flags: e.flags || [],
    type: "embed",
    userDisabled: providerConfig.embeds[e.id]?.disabled ?? false,
    userRank: providerConfig.embeds[e.id]?.rank ?? e.rank,
    customName: providerConfig.embeds[e.id]?.name || null,
  }));

  return res.json({ sources: [...sources, ...externalSources], embeds });
});

app.post("/api/providers/order", (req, res) => {
  const { type, ids } = req.body;
  if (!["sources", "embeds"].includes(type) || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const target = type === "sources" ? getBuiltinSources() : getBuiltinEmbeds();
  const validIds = new Set(target.map((p) => p.id));
  const rankStart = type === "sources" ? 1000 : 1000;

  ids.forEach((id, index) => {
    if (!validIds.has(id)) return;
    const configKey = type === "sources" ? "sources" : "embeds";
    providerConfig[configKey][id] = {
      ...(providerConfig[configKey][id] || {}),
      rank: rankStart - index,
    };
  });

  if (type === "sources") {
    providerConfig.sourceOrder = ids;
  }

  saveConfig();
  return res.json({ success: true });
});

app.post("/api/providers/toggle", (req, res) => {
  const { id, type, disabled } = req.body;
  if (!id || !["source", "embed"].includes(type)) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const configKey = type === "source" ? "sources" : "embeds";
  providerConfig[configKey][id] = {
    ...(providerConfig[configKey][id] || {}),
    disabled,
  };
  saveConfig();
  return res.json({ success: true });
});

app.get("/api/providers/config", (req, res) => {
  return res.json(providerConfig);
});

app.post("/api/providers/rank", (req, res) => {
  const { id, type, rank } = req.body;
  if (!id || !["source", "embed"].includes(type) || typeof rank !== "number") {
    return res.status(400).json({ error: "Invalid request" });
  }
  const configKey = type === "source" ? "sources" : "embeds";
  providerConfig[configKey][id] = {
    ...(providerConfig[configKey][id] || {}),
    rank,
  };
  saveConfig();
  return res.json({ success: true });
});

app.post("/api/providers/rename", (req, res) => {
  const { id, type, name } = req.body;
  if (!id || !["source", "embed"].includes(type) || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid request" });
  }
  const configKey = type === "source" ? "sources" : "embeds";
  providerConfig[configKey][id] = {
    ...(providerConfig[configKey][id] || {}),
    name: name.trim() || undefined,
  };
  saveConfig();
  return res.json({ success: true });
});

app.get("/api/providers/reset", (req, res) => {
  providerConfig = { sources: {}, embeds: {}, sourceOrder: [] };
  saveConfig();
  return res.json({ success: true });
});

app.use(express.static(join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Providers dashboard running on port ${PORT}`);
});
