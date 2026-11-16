/**
 * Third-party DeepSeek-native.
 *
 * Registers a dedicated provider (`dsh-llm-third-party-native`) that runs alongside the official
 * DeepSeek route, serving any Anthropic-compatible Messages endpoint (OpenRouter, LiteLLM,
 * self-hosted gateways). It provides three wire fixes, a deployment persona suffix, and
 * a local SearXNG web search provider.
 *
 *  1. `thinking.budget_tokens` — the Messages schema requires it whenever `thinking` is enabled.
 *  2. Replayed reasoning blocks — blocks with no native `signature` are rejected; drop them.
 *  3. `session_id` — sticky routing, so upstream prompt caches survive across requests.
 *
 * Wire fixes are applied strictly to this provider route inside the adapter's `prepareExtensions`
 * hook, ensuring the official `deepseek-official` route remains unmutated.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Anchors tried in order when resolving harness packages.
 */
const ANCHORS = [
  process.env.DSH_INSTALL_DIR === undefined ? undefined : join(process.env.DSH_INSTALL_DIR, 'lib', 'bin.js'),
  process.env.DSH_INSTALL_DIR,
  process.argv[1],
  '/usr/local/share/deepseek-harness/apps/cli/lib/bin.js',
  join(homedir(), '.local/share/deepseek-harness/apps/cli/lib/bin.js'),
].filter(anchor => typeof anchor === 'string' && anchor.length > 0)

const installRequire = (() => {
  for (const anchor of ANCHORS) {
    try {
      const candidate = createRequire(anchor)
      candidate.resolve('@deepseek-ai/dsh-llm-deepseek')
      return candidate
    } catch { /* try the next anchor */ }
  }
  throw new Error('dsh-llm-third-party-native: cannot locate the harness installation; set DSH_INSTALL_DIR')
})()

/**
 * Import one harness package from the running installation.
 * @param specifier - the package name.
 * @returns its module namespace.
 */
async function load(specifier) {
  return import(pathToFileURL(installRequire.resolve(specifier)).href)
}

const Schema = (await load('@deepseek-ai/schemastery')).default
const deepseek = await load('@deepseek-ai/dsh-llm-deepseek')
const { LlmError, resolveImageAttachmentAccess } = await load('@deepseek-ai/dsh-llm')
const { launchEnvironmentOf } = await load('@deepseek-ai/dsh-launch-environment')

const {
  DeepSeekAdapter, catalogModelInfo, deepSeekConfigFields, plainOptions, resolveAdapterOptions, resolveDeepSeekApiKey,
} = deepseek

/** Route id owned by this plugin; distinct from `deepseek-official`. */
const PROVIDER = 'dsh-llm-third-party-native'
const DISPLAY_NAME = 'Third-party DeepSeek'
/** Credential reference the Models page derives for this route when the profile names none. */
const DERIVED_KEY_REF = 'DSH_LLM_THIRD_PARTY_NATIVE_API_KEY'
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'

/** Route settings plus the deployment persona suffix. */
export const Config = Schema.object({
  ...deepSeekConfigFields,
  apiKeyEnv: Schema.string().volatile(),
  personaSuffix: Schema.string().default('').volatile(),
  searchURL: Schema.string().default('http://127.0.0.1:8080').volatile(),
  searchAutoStart: Schema.boolean().default(true).volatile(),
  searchTimeoutMs: Schema.number().default(15000).volatile(),
})
export const name = 'dsh-llm-third-party-native'
export const inject = ['llm']

/**
 * Read a config field that may be volatile.
 * @param value - a plain value or a volatile accessor.
 * @returns the current value.
 */
function current(value) {
  return value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value
}

/** Search provider id registered on `ctx.web`. */
const SEARCH_ID = 'dsh-llm-third-party-native'
/** Directory holding the SearXNG compose file and its configuration. */
const SEARCH_DIR = join(dirname(fileURLToPath(import.meta.url)), 'search')

/** Section name for the suffix; distinct from the preset's, which shadows the deployment one. */
const SECTION = 'third-party:persona-suffix'

/**
 * Thinking budget per effort level, monotonic. Anthropic Messages requires `budget_tokens`
 * whenever `thinking.type` is `enabled`.
 */
const BUDGETS = { low: 4096, medium: 8192, high: 16384, xhigh: 32768, max: 32768 }
const DEFAULT_BUDGET = 8192

let cachedUserId = undefined

/**
 * The harness-home anonymous id, shared with telemetry and feedback: a bare UUID file.
 * @returns the id, or a stable placeholder when the file is absent or unreadable.
 */
function anonymousUserId() {
  if (cachedUserId !== undefined) return cachedUserId
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  try {
    const id = readFileSync(join(home, '.anonymous-user-id'), 'utf8').trim()
    if (id.length > 0) {
      cachedUserId = id
      return id
    }
  } catch { /* fall through to the placeholder */ }
  cachedUserId = '00000000-0000-0000-0000-000000000000'
  return cachedUserId
}

/**
 * Rewrite one serialized Messages body into the shape third-party endpoints accept.
 * Mutates in place and avoids redundant array allocations when no thinking blocks exist.
 * @param body - the serialized request body, mutated in place.
 * @param sessionId - the session this request belongs to, used for sticky routing.
 */
function adaptBody(body, sessionId) {
  const thinking = body.thinking
  if (thinking !== undefined && thinking !== null && thinking.type === 'enabled' && thinking.budget_tokens === undefined) {
    thinking.budget_tokens = BUDGETS[body.output_config?.effort] ?? DEFAULT_BUDGET
  }
  if (sessionId !== undefined && body.session_id === undefined) body.session_id = String(sessionId)
  for (const message of body.messages ?? []) {
    if (!Array.isArray(message?.content)) continue
    if (message.content.some(block => block?.type === 'thinking' && block.signature === undefined)) {
      message.content = message.content.filter(block => block?.type !== 'thinking' || block.signature !== undefined)
    }
  }
}

/**
 * Probe the search endpoint.
 * @param base - SearXNG base URL.
 * @param signal - optional cancellation.
 * @returns whether it answered.
 */
async function searchReachable(base, signal) {
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/healthz`, { signal, redirect: 'error' })
    return response.ok
  } catch {
    return false
  }
}

let startingSearch = null

/**
 * Make sure the search endpoint answers, starting the local container once if it does not.
 * Runs on the first search rather than at plugin load, so an idle harness runs no container.
 * In-flight requests share the same startup promise to prevent concurrent process races.
 * @param base - SearXNG base URL.
 * @param autoStart - whether this plugin may start the container.
 * @param timeoutMs - how long to wait for it to become healthy.
 * @param signal - cancellation.
 * @returns nothing; throws when the endpoint stays unreachable.
 */
async function ensureSearch(base, autoStart, timeoutMs, signal) {
  signal?.throwIfAborted()
  if (await searchReachable(base, signal)) return
  if (!autoStart) {
    throw new Error(`no search endpoint at ${base}; start it or enable searchAutoStart`)
  }

  if (!startingSearch) {
    startingSearch = (async () => {
      const port = new URL(base).port || '8080'
      const started = await new Promise(resolve => {
        const child = spawn('docker', ['compose', '-f', join(SEARCH_DIR, 'docker-compose.yml'), 'up', '-d'], {
          stdio: 'ignore',
          env: { ...process.env, SEARXNG_PORT: port },
        })
        child.on('error', () => resolve(false))
        child.on('close', code => resolve(code === 0))
      })
      if (!started) {
        throw new Error(`could not start the local search container for ${base}; is docker running?`)
      }

      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        signal?.throwIfAborted()
        if (await searchReachable(base)) return
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      throw new Error(`the local search container at ${base} did not become healthy within ${String(timeoutMs)}ms`)
    })().finally(() => {
      startingSearch = null
    })
  }

  return startingSearch
}

/**
 * Run one search against SearXNG.
 * @param base - SearXNG base URL.
 * @param query - the search text.
 * @param timeoutMs - request budget.
 * @param signal - cancellation.
 * @returns normalized sources, capped by the caller.
 */
async function runSearch(base, query, timeoutMs, signal) {
  const url = new URL(`${base.replace(/\/+$/, '')}/search`)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  const budget = AbortSignal.timeout(timeoutMs)
  const response = await fetch(url, {
    signal: signal === undefined ? budget : AbortSignal.any([signal, budget]),
    redirect: 'error',
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`SearXNG answered HTTP ${String(response.status)}`)
  const body = await response.json()
  const results = Array.isArray(body?.results) ? body.results : []
  return results.map(entry => ({
    url: String(entry.url ?? ''),
    ...typeof entry.title === 'string' && entry.title.length > 0 ? { title: entry.title } : {},
    ...typeof entry.content === 'string' && entry.content.length > 0
      ? { snippet: entry.content, summary: entry.content }
      : {},
  })).filter(source => source.url.length > 0)
}

/**
 * Register the route, the wire fixes, the persona suffix, and web search.
 * @param ctx - plugin lifetime, with the LLM registry injected.
 * @param config - route settings plus `personaSuffix`.
 */
export function apply(ctx, config) {
  // ── Persona suffix: registered into systemPrompt when available ────────────
  ctx.inject(['systemPrompt'], promptCtx => {
    promptCtx.effect(() => {
      let section = undefined
      const syncPersona = () => {
        section?.()
        section = undefined
        const text = (current(config.personaSuffix) ?? '').trim()
        if (text.length === 0) return
        section = promptCtx.systemPrompt.section({
          name: SECTION,
          order: promptCtx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
          text,
        })
      }
      syncPersona()
      const unlisten = promptCtx.on('loader/volatile-update', syncPersona)
      return () => {
        unlisten()
        section?.()
      }
    }, 'dsh-llm-third-party-native: persona-suffix')
  })

  // ── Web search: a local SearXNG container this bundle owns ──────────────────
  ctx.inject(['web'], webCtx => {
    webCtx.effect(() => webCtx.web.registerSearchProvider({
      id: SEARCH_ID,
      title: 'Local search (SearXNG)',
      description: {
        en: 'Searches a local SearXNG instance. Traffic stays on this machine; no API key or model turn.',
        zh: '通过本地 SearXNG 实例搜索，本机回环通信，无需 API 密钥或额外模型轮次。',
      },
      available: () => true,
      search: async (request, signal) => {
        const base = current(config.searchURL) ?? 'http://127.0.0.1:8080'
        const timeout = current(config.searchTimeoutMs) ?? 15000
        await ensureSearch(base, current(config.searchAutoStart) === true, timeout, signal)
        const sources = await runSearch(base, request.query, timeout, signal)
        const capped = request.maxResults === undefined ? sources : sources.slice(0, request.maxResults)
        return { sources: capped, truncated: capped.length < sources.length }
      },
    }), 'dsh-llm-third-party-native: search provider')
  })

  // Offered in Add provider whether or not it is configured; the Models page hides active routes.
  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: DISPLAY_NAME,
    settingsNs: ctx.fiber.entry?.options.id ?? name,
    settingsPath: [],
    declared: true,
    defaultBaseURL: DEFAULT_BASE_URL,
    nativeAuth: { env: [DERIVED_KEY_REF], oauth: false },
  }])

  const configured = () => current(config.baseURL) !== undefined || current(config.apiKeyEnv) !== undefined
  let adapterDisposer = undefined

  /** Register or refresh the route once its endpoint or key reference exists. */
  const activate = () => {
    if (!configured()) {
      adapterDisposer?.()
      adapterDisposer = undefined
      return
    }
    if (adapterDisposer !== undefined) return

    const options = () => resolveAdapterOptions(plainOptions(config), launchEnvironmentOf(ctx))
    options()

    const resolveApiKey = async () => {
      for (const ref of [current(config.apiKeyEnv), DERIVED_KEY_REF]) {
        if (ref === undefined || ref.length === 0) continue
        const key = await resolveDeepSeekApiKey(ctx, ref)
        if (key !== undefined) return key
      }
      throw new LlmError(
        `dsh-llm-third-party-native: no API key for provider route "${PROVIDER}"; add one in the provider card,`
        + ` which stores ${DERIVED_KEY_REF}, or export it in the launching environment`,
        'MISSING_CREDENTIAL',
      )
    }

    const adapter = new DeepSeekAdapter({
      options,
      providerName: DISPLAY_NAME,
      resolveAuth: async () => ({ headers: { 'x-api-key': await resolveApiKey() } }),
      resolveUserId: anonymousUserId,
      resolveAttachments: () => ctx.get('attachments'),
      resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
        attachments, hostPath => ctx.get('fs')?.processPathFromHostPath(hostPath), ref,
      ),
      discoverModels: async provider => options().models.map(model => catalogModelInfo(provider, model)),
      prepareExtensions: async request => {
        // Apply wire fixes strictly to this custom adapter instance
        adaptBody(request.body, request.sessionId)
        const registry = ctx.get('deepseekLlmApiExtensions')
        return registry === undefined
          ? { fields: {}, accept: () => Promise.resolve() }
          : registry.prepare(request)
      },
    })

    const handle = ctx.llm.registerAdapter([PROVIDER], adapter)
    adapterDisposer = () => handle()
  }

  ctx.effect(() => {
    activate()
    const unlisten = ctx.on('loader/volatile-update', activate)
    return () => {
      unlisten()
      adapterDisposer?.()
      adapterDisposer = undefined
    }
  }, 'dsh-llm-third-party-native: route')
}
