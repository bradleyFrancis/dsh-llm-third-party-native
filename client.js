/**
 * Client half of dsh-llm-third-party-native.
 *
 *  - Settings → Third-party DeepSeek: deployment persona suffix editor.
 *  - Settings → Models: collapsible provider card matching native ModelRow controls.
 *
 * Markup, CSS, and tokens (--dsw-alias-*) follow ui-settings-models' ModelRow and
 * ModelsSection.module.css 1:1 without importing internal client primitive modules.
 */
window.__ModuleLoader__.load({
  id: 'dsh-llm-third-party-native',
  factory(require) {
    const React = typeof require === 'function' ? require('react') : (window.React || globalThis.React);
    const h = React.createElement;

    /** Our own settings namespace: the bundle row id. */
    const NS = 'dsh-llm-third-party-native';
    const DERIVED_KEY_REF = 'DSH_LLM_THIRD_PARTY_NATIVE_API_KEY';

    const PERSONA_WHY = 'Deployment-wide rather than preset-scoped: applies to every agent, lives in '
      + 'your profile, and survives upgrades. The persona plugin\'s suffix belongs to one preset. '
      + 'Empty registers nothing.';

    const CARD_HINT = 'Configure below — custom endpoint, API key, and model catalog.';

    const CARD_CSS = `
.tpds-container { font-family: inherit; color: var(--dsw-alias-label-primary); }
.tpds-card {
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-module-platform);
  overflow: hidden;
  margin: 6px 0;
}
.tpds-summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; user-select: none;
  font-weight: 500; font-size: 13px; background: transparent;
  border: none; width: 100%; text-align: left; color: inherit;
}
.tpds-summary:hover { background: var(--dsw-alias-interactive-bg-hover-solid); }
.tpds-summary-left { display: flex; align-items: center; gap: 8px; }
.tpds-chevron { transition: transform 0.18s ease; display: inline-flex; align-items: center; }
.tpds-chevron.open { transform: rotate(180deg); }
.tpds-form { display: flex; flex-direction: column; gap: 14px; padding: 14px 16px; border-top: 0.5px solid var(--dsw-alias-border-l4); }
.tpds-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.tpds-field-label {
  font-size: 12px; line-height: 18px; font-weight: 500;
  color: var(--dsw-alias-label-secondary); margin: 0;
}
.tpds-input, .tpds-textarea {
  box-sizing: border-box; width: 100%; height: 32px; padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  font: inherit; font-size: 14px; line-height: 22px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.tpds-textarea { height: auto; padding: 8px 10px; }
.tpds-input:focus, .tpds-textarea:focus {
  outline: none; border-color: var(--dsw-alias-state-business-primary);
}
.tpds-input::placeholder, .tpds-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }
.tpds-input:disabled { opacity: 0.6; cursor: default; }
.tpds-select {
  max-width: 240px; cursor: pointer; appearance: none; padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; background-size: 12px 12px;
}
.tpds-btn {
  box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  gap: 4px; height: 36px; padding: 0 14px; border-radius: var(--dsw-radius-md);
  font: inherit; font-size: 14px; line-height: 22px; cursor: pointer;
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: transparent; color: var(--dsw-alias-label-primary);
}
.tpds-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-solid); }
.tpds-btn:disabled { opacity: 0.4; cursor: default; }
.tpds-btn-primary {
  border: none; background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.tpds-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.tpds-btn-danger {
  border: none; background: transparent; color: var(--dsw-alias-state-error-primary);
}
.tpds-btn-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }
.tpds-btn-sm { height: 28px; padding: 0 10px; border-radius: var(--dsw-radius-sm); font-size: 12px; line-height: 18px; }
.tpds-actions { display: flex; justify-content: flex-end; gap: 8px; }
.tpds-model-list { display: flex; flex-direction: column; gap: 8px; }
.tpds-model-entry {
  container: model-row / inline-size;
  position: relative;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
  padding: 6px;
}
.tpds-model-entry[data-dragging] { opacity: 0.5; }
.tpds-model-entry[data-drop-target] { z-index: 1; }
.tpds-model-entry::before, .tpds-model-entry::after {
  content: ''; position: absolute; z-index: 1; left: 0; right: 0; height: 4px;
}
.tpds-model-entry::before { top: -4px; }
.tpds-model-entry::after { bottom: -4px; }
.tpds-model-entry[data-drop-target='before']::before,
.tpds-model-entry[data-drop-target='after']::after {
  height: 12px;
  background:
    linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat,
    linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat,
    linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;
}
.tpds-model-entry[data-drop-target='before']::before { top: -10px; }
.tpds-model-entry[data-drop-target='after']::after { bottom: -10px; }
.tpds-model-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
}
.tpds-model-name { grid-column: 3; grid-row: 1; }
.tpds-model-name-label { display: none; }
@container model-row (max-width: 440px) {
  .tpds-model-row { grid-template-columns: auto minmax(0, 1fr) auto auto; }
  .tpds-model-row .tpds-model-name { display: none; grid-column: 1 / -1; grid-row: 2; padding: 2px 4px 0; }
  .tpds-model-row[data-expanded] .tpds-model-name { display: flex; }
  .tpds-model-name-label { display: block; }
}
.tpds-icon-btn {
  box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: none;
  border-radius: var(--dsw-radius-sm); background: transparent;
  color: var(--dsw-alias-label-tertiary); cursor: pointer;
}
.tpds-icon-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.tpds-icon-btn:disabled { cursor: default; opacity: 0.4; }
.tpds-icon-btn-danger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
}
.tpds-drag-handle:not(:disabled) { cursor: grab; }
.tpds-drag-handle:active:not(:disabled) { cursor: grabbing; }
.tpds-model-advanced {
  display: grid; grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px; padding: 2px 4px;
}
.tpds-model-field { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.tpds-model-field-label {
  color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; margin: 0;
}
.tpds-model-input-types {
  grid-column: 1 / -1; min-width: 0; margin: 0; padding: 0; border: none;
}
.tpds-model-input-types legend { padding: 0; margin-bottom: 4px; }
.tpds-model-input-choices {
  display: flex; flex-wrap: wrap; gap: 16px; min-height: 32px; align-items: center;
}
.tpds-checkbox-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; line-height: 20px; cursor: pointer; user-select: none;
  color: var(--dsw-alias-label-primary); margin: 0;
}
.tpds-checkbox-label input:disabled { cursor: default; opacity: 0.5; }
.tpds-add-model { align-self: flex-start; height: 32px; padding: 0 12px; font-size: 13px; }
.tpds-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); margin: 0; }
.tpds-error { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); margin: 0; }
`;

    function ensureStyles(ctx) {
      if (typeof document === 'undefined') return;
      const sync = () => {
        let el = document.getElementById('tpds-styles');
        if (!el) {
          el = document.createElement('style');
          el.id = 'tpds-styles';
          document.head.appendChild(el);
        }
        if (el.textContent !== CARD_CSS) el.textContent = CARD_CSS;
        return () => { document.getElementById('tpds-styles')?.remove(); };
      };
      if (typeof ctx?.effect === 'function') {
        ctx.effect(sync, 'dsh-llm-third-party-native: styles');
      } else {
        sync();
      }
    }

    function genKey() {
      return Math.random().toString(36).slice(2, 10);
    }

    function parsePositiveInt(raw, label) {
      const trimmed = String(raw ?? '').trim();
      if (trimmed.length === 0) return undefined;
      if (!/^\d+$/.test(trimmed)) throw new Error(`${label} must be a positive integer`);
      const parsed = Number(trimmed);
      if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be at least 1`);
      return parsed;
    }

    function rowHalf(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    }

    /** Inline SVG icons matching ui-primitives sizing (14px). */
    const IconDrag = () => h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true },
      h('circle', { cx: 6, cy: 3.5, r: 1.2 }), h('circle', { cx: 10, cy: 3.5, r: 1.2 }),
      h('circle', { cx: 6, cy: 8, r: 1.2 }), h('circle', { cx: 10, cy: 8, r: 1.2 }),
      h('circle', { cx: 6, cy: 12.5, r: 1.2 }), h('circle', { cx: 10, cy: 12.5, r: 1.2 }),
    );
    const IconChevronRight = () => h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true },
      h('path', { d: 'M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06z' }),
    );
    const IconChevronDown = () => h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true },
      h('path', { d: 'M4.47 5.47a.75.75 0 0 1 1.06 0L8 7.94l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06z' }),
    );
    const IconTrash = () => h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.7 8.2a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8.2' }),
    );

    async function readSection(ctx) {
      const response = await ctx.remote.settings.describe();
      if (!response.ok) return { error: response.error.message };
      const namespaces = response.value.namespaces;
      const namespace = namespaces.find(entry => entry.ns === NS)
        ?? namespaces.find(entry => entry.ns.endsWith(NS));
      if (namespace === undefined) return { error: `no settings namespace ending in "${NS}"` };
      const value = typeof namespace.value !== 'object' || namespace.value === null ? {} : namespace.value;
      return { value, revision: namespace.revision, ns: namespace.ns };
    }

    async function writeSection(ctx, ns, ops, revision) {
      const written = await ctx.remote.settings.mutate(ns, ops, revision);
      if (!written.ok) throw new Error(written.error.message);
      return written.value?.revision ?? revision;
    }

    function labeledField(label, ...children) {
      return h('div', { className: 'tpds-field' },
        h('span', { className: 'tpds-field-label' }, label),
        ...children,
      );
    }

    return {
      inject: ['slots', 'remote', 'remote.settings', 'remote.credentials'],
      apply(ctx) {
        ensureStyles(ctx);

        /** Settings → Third-party DeepSeek: deployment persona suffix. */
        function Section() {
          const [phase, setPhase] = React.useState('loading');
          const [text, setText] = React.useState('');
          const [draft, setDraft] = React.useState('');
          const [error, setError] = React.useState(null);
          const revision = React.useRef(undefined);
          const ns = React.useRef(NS);

          const load = React.useCallback(async () => {
            const section = await readSection(ctx);
            if (section.error !== undefined) {
              setPhase('failed');
              setError(section.error);
              return;
            }
            revision.current = section.revision;
            ns.current = section.ns;
            const current = typeof section.value.personaSuffix === 'string' ? section.value.personaSuffix : '';
            setText(current);
            setDraft(current);
            setPhase('ready');
          }, []);

          React.useEffect(() => {
            load().catch(cause => { setPhase('failed'); setError(String(cause)); });
          }, [load]);

          const isDirty = draft !== text;

          const save = async () => {
            setPhase('saving');
            setError(null);
            try {
              revision.current = await writeSection(ctx, ns.current, [{ op: 'set', path: ['personaSuffix'], value: draft }], revision.current);
              setText(draft);
              setPhase('saved');
            } catch (cause) {
              setPhase('failed');
              setError(cause instanceof Error ? cause.message : String(cause));
            }
          };

          return h('div', { className: 'tpds-container', style: { display: 'grid', gap: '10px', maxWidth: '720px' } },
            h('h2', { style: { margin: '0 0 2px', fontSize: '14px', fontWeight: 600 } }, 'Persona suffix'),
            h('p', { style: { margin: 0, fontSize: '12px', lineHeight: 1.45, opacity: 0.65 } }, PERSONA_WHY),
            h('div', { className: 'tpds-field' },
              h('textarea', {
                className: 'tpds-textarea',
                rows: 4,
                value: draft,
                placeholder: 'Enter deployment persona suffix...',
                onChange: e => {
                  setDraft(e.target.value);
                  if (phase === 'saved') setPhase('ready');
                },
              }),
            ),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
              h('button', {
                type: 'button',
                className: 'tpds-btn tpds-btn-primary',
                disabled: !isDirty || phase === 'saving',
                onClick: () => { save().catch(() => {}); },
              }, phase === 'saving' ? 'Saving…' : 'Save Suffix'),
              isDirty ? h('button', {
                type: 'button',
                className: 'tpds-btn',
                onClick: () => setDraft(text),
              }, 'Reset') : null,
              phase === 'saved' ? h('span', { className: 'tpds-status' }, 'Saved. Applies to new requests.') : null,
              error ? h('span', { className: 'tpds-error' }, error) : null,
            ),
          );
        }

        /** The provider card: collapsible route editor in Settings → Models. */
        function ProviderCard() {
          const [open, setOpen] = React.useState(false);
          const [phase, setPhase] = React.useState('loading');
          const [baseURL, setBaseURL] = React.useState('');
          const [apiKeyEnv, setApiKeyEnv] = React.useState('');
          const [reasoningEffort, setReasoningEffort] = React.useState('');
          const [models, setModels] = React.useState([]);
          const [expanded, setExpanded] = React.useState({});
          const [key, setKey] = React.useState('');
          const [savedKey, setSavedKey] = React.useState(false);
          const [clearKey, setClearKey] = React.useState(false);
          const [error, setError] = React.useState(null);
          const [dragIdx, setDragIdx] = React.useState(null);
          const [dropTarget, setDropTarget] = React.useState(null);
          const revision = React.useRef(undefined);
          const ns = React.useRef(NS);

          const load = React.useCallback(async () => {
            const section = await readSection(ctx);
            if (section.error !== undefined) {
              setPhase('failed');
              setError(section.error);
              return;
            }
            revision.current = section.revision;
            ns.current = section.ns;
            setBaseURL(typeof section.value.baseURL === 'string' ? section.value.baseURL : '');
            setApiKeyEnv(typeof section.value.apiKeyEnv === 'string' ? section.value.apiKeyEnv : '');
            setReasoningEffort(typeof section.value.reasoningEffort === 'string' ? section.value.reasoningEffort : '');
            const reference = typeof section.value.apiKeyEnv === 'string' && section.value.apiKeyEnv.length > 0
              ? section.value.apiKeyEnv
              : DERIVED_KEY_REF;
            const described = await ctx.remote.credentials.describe([reference]);
            setSavedKey(described.ok && described.value?.[reference]?.configured === true);
            setClearKey(false);
            const listed = Array.isArray(section.value.models) ? section.value.models : [];
            setModels(listed.map(entry => {
              const { id, name, contextWindow, maxTokens, inputModalities, ...extra } =
                (entry && typeof entry === 'object') ? entry : {};
              const modalities = Array.isArray(inputModalities) && inputModalities.length > 0
                ? inputModalities.filter(v => v === 'text' || v === 'image')
                : ['text'];
              return {
                _key: genKey(),
                _extra: extra,
                id: typeof id === 'string' ? id : '',
                name: typeof name === 'string' ? name : '',
                contextWindow: typeof contextWindow === 'number' ? String(contextWindow) : '',
                maxTokens: typeof maxTokens === 'number' ? String(maxTokens) : '',
                inputModalities: modalities.length > 0 ? modalities : ['text'],
              };
            }));
            setPhase('ready');
          }, []);

          React.useEffect(() => {
            load().catch(cause => { setPhase('failed'); setError(String(cause)); });
          }, [load]);

          const editModel = (idx, field, val) => {
            setModels(curr => curr.map((m, i) => (i === idx ? { ...m, [field]: val } : m)));
          };

          const toggleModality = (idx, modality, checked) => {
            setModels(curr => curr.map((m, i) => {
              if (i !== idx) return m;
              const next = ['text', 'image'].filter(v => (v === modality ? checked : m.inputModalities.includes(v)));
              if (next.length === 0) return m;
              const extra = { ...m._extra };
              if (!next.includes('image')) {
                delete extra.imagePixelBudget;
                delete extra.imageMaxBytes;
              }
              return { ...m, _extra: extra, inputModalities: next };
            }));
          };

          const moveModel = (fromIdx, toIdx) => {
            setModels(curr => {
              if (fromIdx === null || toIdx < 0 || toIdx >= curr.length || fromIdx === toIdx) return curr;
              const next = [...curr];
              const [item] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, item);
              return next;
            });
          };

          const dropModel = (targetIdx, half) => {
            if (dragIdx === null) return;
            let dest = half === 'after' ? targetIdx + 1 : targetIdx;
            if (dragIdx < dest) dest -= 1;
            moveModel(dragIdx, dest);
            setDragIdx(null);
            setDropTarget(null);
          };

          const save = async () => {
            setPhase('saving');
            setError(null);
            try {
              const cleanModels = models
                .filter(m => m.id.trim().length > 0)
                .map(m => {
                  const out = { ...m._extra, id: m.id.trim() };
                  if (m.name.trim().length > 0) out.name = m.name.trim();
                  const cw = parsePositiveInt(m.contextWindow, `Model "${out.id}" contextWindow`);
                  if (cw !== undefined) out.contextWindow = cw;
                  const mt = parsePositiveInt(m.maxTokens, `Model "${out.id}" maxTokens`);
                  if (mt !== undefined) out.maxTokens = mt;
                  out.inputModalities = m.inputModalities;
                  return out;
                });
              const trimmedKeyEnv = apiKeyEnv.trim();
              const ops = [
                { op: 'set', path: ['baseURL'], value: baseURL.trim() },
                { op: 'set', path: ['models'], value: cleanModels },
                trimmedKeyEnv.length > 0
                  ? { op: 'set', path: ['apiKeyEnv'], value: trimmedKeyEnv }
                  : { op: 'unset', path: ['apiKeyEnv'] },
                reasoningEffort
                  ? { op: 'set', path: ['reasoningEffort'], value: reasoningEffort }
                  : { op: 'unset', path: ['reasoningEffort'] },
              ];

              const reference = apiKeyEnv.trim() || DERIVED_KEY_REF;
              if (clearKey) {
                await ctx.remote.credentials.unset(reference);
              } else if (key.length > 0) {
                const stored = await ctx.remote.credentials.set(reference, key);
                if (!stored.ok) throw new Error(stored.error.message);
              }

              revision.current = await writeSection(ctx, ns.current, ops, revision.current);
              setKey('');
              setClearKey(false);
              await load();
              setPhase('saved');
            } catch (cause) {
              setPhase('failed');
              setError(cause instanceof Error ? cause.message : String(cause));
            }
          };

          const saving = phase === 'saving';

          return h('div', { className: 'tpds-container tpds-card' },
            h('button', {
              type: 'button',
              className: 'tpds-summary',
              onClick: () => setOpen(curr => !curr),
            },
              h('div', { className: 'tpds-summary-left' },
                h('span', { className: `tpds-chevron ${open ? 'open' : ''}` }, h(IconChevronDown)),
                h('span', null, 'Third-party DeepSeek Settings'),
              ),
              !open ? h('span', { className: 'tpds-status' }, CARD_HINT) : null,
            ),
            open ? h('div', { className: 'tpds-form' },
              labeledField('Endpoint (Base URL)',
                h('input', {
                  className: 'tpds-input',
                  value: baseURL,
                  placeholder: 'https://openrouter.ai/api/v1',
                  spellCheck: false,
                  disabled: saving,
                  onChange: e => setBaseURL(e.target.value),
                }),
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '12px' } },
                labeledField('API Key Reference',
                  h('input', {
                    className: 'tpds-input',
                    value: apiKeyEnv,
                    placeholder: DERIVED_KEY_REF,
                    spellCheck: false,
                    disabled: saving,
                    onChange: e => setApiKeyEnv(e.target.value),
                  }),
                ),
                labeledField('Default Reasoning Effort',
                  h('select', {
                    className: 'tpds-input tpds-select',
                    value: reasoningEffort,
                    disabled: saving,
                    onChange: e => setReasoningEffort(e.target.value),
                  },
                    h('option', { value: '' }, 'Default (high)'),
                    ['off', 'low', 'high', 'max'].map(level => h('option', { key: level, value: level }, level)),
                  ),
                ),
              ),
              labeledField('API Key',
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                  h('input', {
                    type: 'password',
                    className: 'tpds-input',
                    value: key,
                    autoComplete: 'new-password',
                    disabled: saving,
                    placeholder: clearKey
                      ? 'Marked for removal'
                      : (savedKey ? '•••••••• (configured)' : 'Not configured'),
                    onChange: e => {
                      setKey(e.target.value);
                      if (clearKey) setClearKey(false);
                    },
                  }),
                  savedKey && !clearKey ? h('button', {
                    type: 'button',
                    className: 'tpds-btn tpds-btn-danger tpds-btn-sm',
                    disabled: saving,
                    onClick: () => { setClearKey(true); setKey(''); },
                  }, 'Remove') : null,
                  clearKey ? h('button', {
                    type: 'button',
                    className: 'tpds-btn tpds-btn-sm',
                    disabled: saving,
                    onClick: () => setClearKey(false),
                  }, 'Undo') : null,
                ),
                h('span', { className: 'tpds-status' },
                  clearKey
                    ? 'Key will be removed when changes are applied.'
                    : (savedKey
                        ? 'Key is saved. Type a new value to replace it, or click Remove.'
                        : 'No key configured.')),
              ),
              labeledField('Models',
                h('div', { className: 'tpds-model-list' },
                  models.map((m, idx) => {
                    const isExpanded = expanded[m._key] === true;
                    const isDragging = dragIdx === idx;
                    const targetHalf = !isDragging && dropTarget?.index === idx ? dropTarget.half : undefined;
                    return h('div', {
                      key: m._key,
                      className: 'tpds-model-entry',
                      'data-dragging': isDragging ? '' : undefined,
                      'data-drop-target': targetHalf,
                      onDragOver: e => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const half = rowHalf(e);
                        if (dropTarget?.index !== idx || dropTarget?.half !== half) {
                          setDropTarget({ index: idx, half });
                        }
                      },
                      onDragLeave: e => {
                        if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
                        if (dropTarget?.index === idx) setDropTarget(null);
                      },
                      onDrop: e => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                        dropModel(idx, rowHalf(e));
                      },
                    },
                      h('div', {
                        className: 'tpds-model-row',
                        'data-expanded': isExpanded ? '' : undefined,
                      },
                        h('button', {
                          type: 'button',
                          className: 'tpds-icon-btn tpds-drag-handle',
                          disabled: saving,
                          draggable: !saving,
                          title: 'Drag or press ↑ / ↓ to reorder',
                          'aria-label': `Reorder model ${String(idx + 1)}`,
                          onDragStart: e => {
                            setDragIdx(idx);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(idx));
                            const card = e.currentTarget.closest('.tpds-model-entry');
                            if (card && typeof e.dataTransfer.setDragImage === 'function') {
                              e.dataTransfer.setDragImage(card, 16, 16);
                            }
                          },
                          onDragEnd: () => {
                            setDragIdx(null);
                            setDropTarget(null);
                          },
                          onKeyDown: e => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              e.stopPropagation();
                              moveModel(idx, idx - 1);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              e.stopPropagation();
                              moveModel(idx, idx + 1);
                            }
                          },
                        }, h(IconDrag)),
                        h('label', { className: 'tpds-model-field' },
                          h('input', {
                            className: 'tpds-input',
                            type: 'text',
                            value: m.id,
                            placeholder: 'Model ID',
                            'aria-label': `Model ID ${String(idx + 1)}`,
                            spellCheck: false,
                            disabled: saving,
                            onChange: e => editModel(idx, 'id', e.target.value),
                          }),
                        ),
                        h('button', {
                          type: 'button',
                          className: 'tpds-icon-btn',
                          'aria-label': `Model settings ${String(idx + 1)}`,
                          'aria-expanded': isExpanded,
                          title: 'Model settings',
                          onClick: () => setExpanded(curr => ({ ...curr, [m._key]: !curr[m._key] })),
                        }, h(isExpanded ? IconChevronDown : IconChevronRight)),
                        h('button', {
                          type: 'button',
                          className: 'tpds-icon-btn tpds-icon-btn-danger',
                          'aria-label': `Remove model ${String(idx + 1)}`,
                          title: 'Remove model',
                          disabled: saving,
                          onClick: () => setModels(curr => curr.filter((_, i) => i !== idx)),
                        }, h(IconTrash)),
                        h('label', { className: 'tpds-model-field tpds-model-name' },
                          h('span', { className: 'tpds-model-field-label tpds-model-name-label' }, 'Display name'),
                          h('input', {
                            className: 'tpds-input',
                            type: 'text',
                            value: m.name,
                            placeholder: 'Display name',
                            'aria-label': `Display name ${String(idx + 1)}`,
                            spellCheck: false,
                            disabled: saving,
                            onChange: e => editModel(idx, 'name', e.target.value),
                          }),
                        ),
                        isExpanded ? h('div', { className: 'tpds-model-advanced' },
                          [['contextWindow', 'Context window', '1000000'], ['maxTokens', 'Max output tokens', '256000']].map(
                            ([field, label, placeholder]) => h('label', { key: field, className: 'tpds-model-field' },
                              h('span', { className: 'tpds-model-field-label' }, label),
                              h('input', {
                                className: 'tpds-input',
                                type: 'text',
                                inputMode: 'numeric',
                                value: m[field],
                                placeholder,
                                'aria-label': `${label} ${String(idx + 1)}`,
                                disabled: saving,
                                onChange: e => editModel(idx, field, e.target.value),
                              }),
                            ),
                          ),
                          h('fieldset', {
                            className: 'tpds-model-input-types',
                            'aria-label': `Input types ${String(idx + 1)}`,
                          },
                            h('legend', { className: 'tpds-model-field-label' }, 'Input types'),
                            h('div', { className: 'tpds-model-input-choices' },
                              ['text', 'image'].map(modality => {
                                const checked = m.inputModalities.includes(modality);
                                const onlySelected = m.inputModalities.length === 1 && checked;
                                return h('label', { key: modality, className: 'tpds-checkbox-label' },
                                  h('input', {
                                    type: 'checkbox',
                                    checked,
                                    disabled: saving || onlySelected,
                                    onChange: e => toggleModality(idx, modality, e.target.checked),
                                  }),
                                  modality === 'text' ? 'Text' : 'Image',
                                );
                              }),
                            ),
                          ),
                        ) : null,
                      ),
                    );
                  }),
                ),
                h('button', {
                  type: 'button',
                  className: 'tpds-btn tpds-add-model',
                  disabled: saving,
                  onClick: () => setModels(curr => [...curr, {
                    _key: genKey(), _extra: {}, id: '', name: '', contextWindow: '', maxTokens: '', inputModalities: ['text'],
                  }]),
                }, '+ Add model'),
              ),
              h('div', { className: 'tpds-actions' },
                h('button', {
                  type: 'button',
                  className: 'tpds-btn',
                  disabled: saving,
                  onClick: () => { load().catch(() => {}); setOpen(false); },
                }, 'Cancel'),
                h('button', {
                  type: 'button',
                  className: 'tpds-btn tpds-btn-primary',
                  disabled: saving,
                  onClick: () => { save().catch(() => {}); },
                }, saving ? 'Applying…' : 'Apply'),
              ),
              phase === 'saved' ? h('p', { className: 'tpds-status' }, 'Settings applied.') : null,
              error ? h('p', { className: 'tpds-error' }, error) : null,
            ) : null,
          );
        }

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-llm-third-party-native',
          order: 60,
          label: () => 'Third-party DS',
        }, Section));

        ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
          name: 'settings.models.provider-card',
          key: NS,
        }, ProviderCard));
      },
    };
  },
});
