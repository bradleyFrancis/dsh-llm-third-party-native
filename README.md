<div align="center">
  <img src="./icon.svg" alt="Third-party DeepSeek" width="72" height="72" />
  <h1>dsh-llm-third-party-native</h1>
</div>

Registers a dedicated, first-class provider (`dsh-llm-third-party-native`) running alongside the official route (`deepseek-official`), allowing you to use DeepSeek's **native adapter** (`DeepSeekAdapter`) for custom Anthropic-compatible Messages endpoints (OpenRouter, LiteLLM, vLLM, self-hosted gateways) instead of routing them through the generic Pi adapter (`llm-pi-ai`).

Includes wire-compatibility fixes for third-party Messages gateways, an editable deployment persona suffix, and a batteries-included local SearXNG provider on `ctx.web`.

Because it registers as its own distinct provider, your official DeepSeek configuration (`api.deepseek.com` and `DEEPSEEK_API_KEY`) remains completely intact and unmutated.

---

## Why Use the DeepSeek Native Adapter Over `llm-pi-ai`?

Both `llm-deepseek` and `llm-pi-ai` support Anthropic Messages endpoints, `budget_tokens`, and session affinity headers (`x-session-id` / `x-session-affinity`). The real differences lie in **prompt structure, replay handling, and harness integration**, which directly affect model behavior on DeepSeek models:

| Capability | Pi Adapter (`llm-pi-ai`) on Custom Routes | Native Adapter with `dsh-llm-third-party-native` |
| :--- | :--- | :--- |
| **System & Tool Updates** | Hand-declared routes lack catalog compat flags, so mid-conversation system updates become `user`-role reminders and the full tool list is resent at the start. | Natively formats developer updates as in-history `system` turns with incremental `tool_addition` / `tool_removal` deltas. |
| **Unsigned Thinking Replay** | Converts unsigned thinking blocks into visible assistant `text` blocks, leaking raw internal reasoning into conversation history. | Drops unsigned `thinking` blocks so prior turns remain clean without triggering schema rejections. |
| **Stop Sequences** | `GenerateOptions.stop` is unsupported. | Natively maps `options.stop` to `stop_sequences`. |
| **Image Handling** | Accepts images only in `user` and `tool-result` messages; no DeepSeek image token math. | DeepSeek-native image pixel budgeting, resizing targets (`imageRequestTarget`), and attachment resolution. |
| **Error Classification** | Relies on regex matching over raw error text (`stream.ts`) where the underlying SDK hides HTTP status codes. | Direct `fetch` transport with exact HTTP status mapping and typed `LlmError` codes. |

---

## The Three Wire Fixes

`DeepSeekAdapter` serializes requests for `api.deepseek.com/anthropic` (sending `thinking.type: "enabled"` with `output_config.effort`, without `budget_tokens`). Third-party gateways enforce stricter Anthropic schema rules and stateless load balancing. This plugin intercepts the serialized body inside its own adapter's `prepareExtensions` hook:

1. **Thinking Budgets (`thinking.budget_tokens`)**
   * *Why*: Conforming Anthropic Messages endpoints require an explicit integer `budget_tokens` whenever `thinking.type === "enabled"`.
   * *Fix*: Populates `budget_tokens` from `output_config.effort` on a monotonic ladder:
     * `low`: 4,096 tokens
     * `medium`: 8,192 tokens (default)
     * `high`: 16,384 tokens
     * `xhigh` / `max`: 32,768 tokens

2. **Reasoning Replay Sanitization**
   * *Why*: Replayed `thinking` blocks without a native `signature` (e.g., from imported or cross-provider history) are rejected by strict Messages gateways.
   * *Fix*: Drops unsigned `thinking` blocks before serialization so history degrades cleanly instead of failing the request.

3. **Sticky Session Routing (`session_id`)**
   * *Why*: Stateless proxies in front of vLLM, LiteLLM, or OpenRouter can scatter consecutive turns across backend workers, reducing KV cache reuse.
   * *Fix*: Attaches top-level `session_id` to the request body for upstream session affinity.

> [!NOTE]
> Wire fixes are scoped strictly to `dsh-llm-third-party-native`. Requests sent through `deepseek-official` are never modified.

---

## Configuration & Management

### 1. Provider Settings & Models (Settings → Models)
Open **Settings → Models** and expand the **Third-party DeepSeek Settings** card:
* **Endpoint (Base URL)**: The Messages endpoint base URL (the adapter appends `/messages`), e.g. `https://openrouter.ai/api/v1` or `http://localhost:4000/v1`.
* **API Key Reference**: Credential identifier (defaults to `DSH_LLM_THIRD_PARTY_NATIVE_API_KEY`).
* **API Key**: Stored in the harness credential vault; includes explicit Remove and Undo controls.
* **Models**: Add custom gateway model IDs with **▲** / **▼** reordering controls.

### 2. Deployment Persona Suffix (Settings → Third-party DS)
Set a deployment-wide prompt suffix that applies across all agent presets (`DEPLOYMENT_PERSONA_SUFFIX`). Empty registers nothing.

### 3. Local Web Search (`ctx.web` via SearXNG)
Independent of the LLM adapter, this bundle registers a `ctx.web` search provider backed by a local SearXNG container (`search/docker-compose.yml`) so agents have zero-API-key web search out of the box:
* **Local Interface**: Harness-to-SearXNG traffic stays on loopback (`127.0.0.1`); SearXNG itself makes outbound queries to upstream search engines.
* **Zero Idle Overhead**: Configured with `restart: "no"`, starting lazily on the first search.
* **Concurrency Safe**: In-flight startup lock prevents duplicate `docker compose` spawns during parallel tool calls.
* **Config Fields**: `searchURL` (default `http://127.0.0.1:8080`, port bound dynamically), `searchAutoStart` (default `true`), `searchTimeoutMs` (default `15000`).

---

## Build & Install

Requires DeepSeek Harness `>=0.2.2-rc.3`, Node.js `>=20`, and Docker (for local SearXNG search). Zero build step required: authored in plain Node.js ESM and browser-native ModuleLoader.

```bash
# Validate syntax and compose configuration
node --check index.js && node --check client.js
docker compose -f search/docker-compose.yml config

# Package distribution tarball (.tgz)
npm pack

# Install via DSH CLI (or GUI: Plugins → Add Plugin → Local Directory)
dsh plugin add /path/to/dsh-llm-third-party-native
```

Or append to your profile's `$DSH_HOME/profiles/<name>/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-llm-third-party-native
      name: dsh-llm-third-party-native
```
