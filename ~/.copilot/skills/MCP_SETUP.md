# Dual-AI Evaluation Engine — MCP Configuration

## GitHub Copilot MCP Setup

### 1. Repository Secrets (Settings → Secrets and variables → Actions → Environment: `copilot`)

Create a `copilot` environment in your repository, then add these secrets:

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your `sk-ant-...` key for Claude Sonnet 4 |
| `OPENAI_API_KEY` | Yes | Your `sk-...` key for GPT-4o |
| `DUAL_AI_MCP_TOKEN` | Optional | Bearer token if you deploy the MCP server behind auth |

### 2. Copilot MCP Configuration

Paste this into your repository's Copilot MCP configuration (Settings → Copilot → MCP servers):

```json
{
  "mcpServers": {
    "dual-ai-eval": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "${workspaceFolder}/mcp-server",
      "env": {
        "ANTHROPIC_API_KEY": "${secrets.ANTHROPIC_API_KEY}",
        "OPENAI_API_KEY": "${secrets.OPENAI_API_KEY}"
      }
    }
  }
}
```

### 3. Available MCP Tools

Once configured, Copilot gains these tools:

| Tool | Description |
|------|-------------|
| `eval_classify_domain` | Classify a query as technical, legal, reasoning_heavy, or mixed |
| `eval_dispatch` | Send query to Claude + GPT simultaneously with domain-aware prompts |
| `eval_matrix_evaluate` | Run 8-dimension adversarial matrix evaluation on two responses |
| `eval_synthesise` | Produce single expert output from evaluation results |
| `eval_run_pipeline` | Execute the full 5-stage pipeline end-to-end |
| `eval_score_single` | Score a single response against the matrix (no comparison) |
| `eval_list_capabilities` | List all dimensions, failure modes, domains, and verdicts |

### 4. Usage Examples in Copilot

```
@copilot Run the full evaluation pipeline on: "What are the defences available under s.49(1)(bb) RSA 1986 (Vic)?" using the legal domain
```

```
@copilot Use eval_dispatch to send this query to both models: "Analyse the failure mode in a distributed cache with 64% hit rate drop after deployment"
```

```
@copilot Score this response against the evaluation matrix for the technical domain: [paste response]
```

### 5. Local Development

```bash
cd mcp-server
npm install
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
npm run dev
```

Test with the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

### 6. Claude Desktop Integration

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dual-ai-eval": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### 7. VS Code / Claude Code Integration

Add to `.vscode/mcp.json` or your Claude Code MCP config:

```json
{
  "servers": {
    "dual-ai-eval": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}",
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
      }
    }
  }
}
```
