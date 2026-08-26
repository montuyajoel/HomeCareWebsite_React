import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const endpoint = process.env.FOUNDRY_ENDPOINT;
const agentName = process.env.FOUNDRY_AGENT_NAME;

const credential = new DefaultAzureCredential();
const projectClient =
  endpoint && agentName
    ? new AIProjectClient(endpoint, credential)
    : null;

function buildAgentInput({ message, history = [], user }) {
  const lines = [];

  if (user?.fullName || user?.employeeCode || user?.role) {
    lines.push(
      `Signed-in user context: name=${user.fullName || "unknown"}; employeeCode=${user.employeeCode || "unknown"}; role=${user.role || "unknown"}.`
    );
  }

  if (Array.isArray(history) && history.length > 0) {
    lines.push("Recent conversation:");
    for (const turn of history.slice(-12)) {
      const role = turn.role || turn.author || "user";
      const content = turn.content || turn.text || turn.message || "";
      if (content) {
        lines.push(`${role}: ${content}`);
      }
    }
  }

  lines.push(`User message: ${message}`);
  return lines.join("\n");
}

function isFoundryConfigured() {
  return Boolean(endpoint && agentName && projectClient);
}

app.get("/api/health", async (req, res) => {
  const deep = req.query.deep === "1" || req.query.deep === "true";
  const base = {
    status: "ok",
    service: "uhie-chat",
    foundryConfigured: isFoundryConfigured(),
    agentName: agentName || null,
    timestamp: new Date().toISOString()
  };

  if (!deep) {
    return res.json(base);
  }

  if (!isFoundryConfigured()) {
    return res.status(503).json({
      ...base,
      status: "degraded",
      error: "FOUNDRY_ENDPOINT and FOUNDRY_AGENT_NAME are required"
    });
  }

  try {
    const agent = await projectClient.agents.get(agentName);
    return res.json({
      ...base,
      status: "ok",
      agent: {
        name: agent.name,
        version: agent.versions?.latest?.version || null
      }
    });
  } catch (error) {
    console.error("Foundry health check failed:", error);
    return res.status(503).json({
      ...base,
      status: "degraded",
      error: error.message
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], user } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (!isFoundryConfigured()) {
      return res.status(503).json({
        error:
          "Foundry is not configured. Set FOUNDRY_ENDPOINT and FOUNDRY_AGENT_NAME on the server."
      });
    }

    const agent = await projectClient.agents.get(agentName);
    console.log("Agent:", agent.name);
    console.log("Version:", agent.versions?.latest?.version);
    console.log(
      "Chat user:",
      user?.fullName || "unknown",
      user?.employeeCode || "",
      user?.role || ""
    );

    const openaiClient = projectClient.getOpenAIClient({
      agentName
    });

    const input = buildAgentInput({
      message: String(message).trim(),
      history,
      user
    });

    const response = await openaiClient.responses.create({
      input
    });

    const reply = response.output_text || "";

    return res.json({
      reply,
      response: reply
    });
  } catch (error) {
    console.error("Foundry error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Uhie chat server running on http://localhost:${port}`);
  console.log(
    `Foundry configured: ${isFoundryConfigured() ? "yes" : "no (set FOUNDRY_ENDPOINT + FOUNDRY_AGENT_NAME)"}`
  );
});
