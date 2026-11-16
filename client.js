/**
 * Client half of dsh-llm-third-party-native.
 *
 *  - Settings → Third-party DeepSeek: deployment persona suffix editor.
 *  - Settings → Models: collapsible provider card for the third-party route.
 *
 * Controls are built with native semantic elements styled with host theme tokens
 * (--dsw-alias-*), avoiding direct imports of harness internal client packages.
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
.tpds-container { font-family: inherit; color: var(--dsw-alias-label-primary, inherit); }
.tpds-card {
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128,128,128,0.25));
  border-radius: var(--dsw-radius-lg, 8px);
  background: var(--dsw-alias-bg-module-platform, transparent);
  overflow: hidden;
  margin: 6px 0;
}
.tpds-summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; user-select: none;
  font-weight: 500; font-size: 13px; background: transparent;
  border: none; width: 100%; text-align: left; color: inherit;
}
.tpds-summary:hover { background: var(--dsw-alias-interactive-bg-hover-solid, rgba(128,128,128,0.06)); }
.tpds-summary-left { display: flex; align-items: center; gap: 8px; }
.tpds-chevron { transition: transform 0.18s ease; display: inline-flex; align-items: center; }
.tpds-chevron.open { transform: rotate(180deg); }
.tpds-form { display: grid; gap: 12px; padding: 14px; border-top: 0.5px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.15)); }
.tpds-field { display: grid; gap: 6px; }
.tpds-label { font-size: 12px; font-weight: 500; opacity: 0.75; }
.tpds-input, .tpds-textarea {
  box-sizing: border-box; width: 100%; padding: 7px 10px; font: inherit; font-size: 13px;
  border-radius: var(--dsw-radius-md, 6px);
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128,128,128,0.3));
  background: var(--dsw-alias-bg-field, transparent);
  color: var(--dsw-alias-label-primary, inherit); outline: none;
}
.tpds-input:focus, .tpds-textarea:focus {
  border-color: var(--dsw-alias-border-focused, #0066cc);
}
.tpds-btn {
  box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  gap: 4px; height: 32px; padding: 0 12px; border-radius: var(--dsw-radius-md, 6px);
  font: inherit; font-size: 13px; line-height: 20px; cursor: pointer;
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128,128,128,0.3));
  background: transparent; color: var(--dsw-alias-label-primary, inherit);
}
.tpds-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-solid, rgba(128,128,128,0.08)); }
.tpds-btn:disabled { opacity: 0.4; cursor: default; }
.tpds-btn-primary {
  border: none; background: var(--dsw-alias-button-primary-fill, #0066cc);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.tpds-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #0052a3); }
.tpds-btn-danger {
  border: none; background: transparent; color: var(--dsw-alias-state-error-primary, #e5484d);
}
.tpds-btn-danger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover-danger, rgba(229, 72, 77, 0.12));
}
.tpds-btn-sm { height: 26px; padding: 0 8px; font-size: 12px; }
.tpds-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
.tpds-model-entry {
  border: 0.5px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.2));
  border-radius: var(--dsw-radius-md, 6px); padding: 8px; margin-bottom: 6px;
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  align-items: center; gap: 8px;
}
.tpds-status { font-size: 12px; opacity: 0.7; margin: 2px 0 0; }
.tpds-error { font-size: 12px; color: var(--dsw-alias-state-error-primary, #e5484d); margin: 2px 0 0; }
`;

    function ensureStyles() {
      if (typeof document === 'undefined') return;
      if (document.getElementById('tpds-styles')) return;
      const el = document.createElement('style');
      el.id = 'tpds-styles';
      el.textContent = CARD_CSS;
      document.head.appendChild(el);
    }

    /** Helper for a unique local key. */
    function genKey() {
      return Math.random().toString(36).slice(2, 10);
    }

    /**
     * Read this plugin's settings section and its revision.
     */
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

    /**
     * Write ops into our settings section and return the new revision.
     */
    async function writeSection(ctx, ns, ops, revision) {
      const written = await ctx.remote.settings.mutate(ns, ops, revision);
      if (!written.ok) throw new Error(written.error.message);
      return written.value?.revision ?? revision;
    }

    return {
      inject: ['slots', 'remote', 'remote.settings', 'remote.credentials'],
      apply(ctx) {
        ensureStyles();

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
          const [models, setModels] = React.useState([]);
          const [key, setKey] = React.useState('');
          const [savedKey, setSavedKey] = React.useState(false);
          const [clearKey, setClearKey] = React.useState(false);
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
            setBaseURL(typeof section.value.baseURL === 'string' ? section.value.baseURL : '');
            setApiKeyEnv(typeof section.value.apiKeyEnv === 'string' ? section.value.apiKeyEnv : '');
            const reference = typeof section.value.apiKeyEnv === 'string' && section.value.apiKeyEnv.length > 0
              ? section.value.apiKeyEnv
              : DERIVED_KEY_REF;
            const described = await ctx.remote.credentials.describe([reference]);
            setSavedKey(described.ok && described.value?.[reference]?.configured === true);
            setClearKey(false);
            const listed = Array.isArray(section.value.models) ? section.value.models : [];
            setModels(listed.map(entry => ({
              _key: genKey(),
              id: typeof entry?.id === 'string' ? entry.id : '',
              name: typeof entry?.name === 'string' ? entry.name : '',
            })));
            setPhase('ready');
          }, []);

          React.useEffect(() => {
            load().catch(cause => { setPhase('failed'); setError(String(cause)); });
          }, [load]);

          const editModel = (idx, field, val) => {
            setModels(curr => curr.map((m, i) => (i === idx ? { ...m, [field]: val } : m)));
          };

          const moveModel = (fromIdx, toIdx) => {
            setModels(curr => {
              if (toIdx < 0 || toIdx >= curr.length) return curr;
              const next = [...curr];
              const [item] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, item);
              return next;
            });
          };

          const save = async () => {
            setPhase('saving');
            setError(null);
            try {
              const cleanModels = models
                .filter(m => m.id.trim().length > 0)
                .map(m => ({ id: m.id.trim(), ...m.name.trim().length === 0 ? {} : { name: m.name.trim() } }));
              const ops = [
                { op: 'set', path: ['baseURL'], value: baseURL.trim() },
                { op: 'set', path: ['models'], value: cleanModels },
              ];
              if (apiKeyEnv.trim().length > 0) ops.push({ op: 'set', path: ['apiKeyEnv'], value: apiKeyEnv.trim() });
              
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

          return h('div', { className: 'tpds-container tpds-card' },
            h('button', {
              type: 'button',
              className: 'tpds-summary',
              onClick: () => setOpen(curr => !curr),
            },
              h('div', { className: 'tpds-summary-left' },
                h('span', { className: `tpds-chevron ${open ? 'open' : ''}` },
                  h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor' },
                    h('path', { d: 'M4.47 5.47a.75.75 0 0 1 1.06 0L8 7.94l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06z' }),
                  ),
                ),
                h('span', null, 'Third-party DeepSeek Settings'),
              ),
              !open ? h('span', { className: 'tpds-status' }, CARD_HINT) : null,
            ),
            open ? h('div', { className: 'tpds-form' },
              h('div', { className: 'tpds-field' },
                h('label', { className: 'tpds-label' }, 'Endpoint (Base URL)'),
                h('input', {
                  className: 'tpds-input',
                  value: baseURL,
                  placeholder: 'https://openrouter.ai/api/v1',
                  spellCheck: false,
                  onChange: e => setBaseURL(e.target.value),
                }),
              ),
              h('div', { className: 'tpds-field' },
                h('label', { className: 'tpds-label' }, 'API Key Reference'),
                h('input', {
                  className: 'tpds-input',
                  value: apiKeyEnv,
                  placeholder: DERIVED_KEY_REF,
                  spellCheck: false,
                  onChange: e => setApiKeyEnv(e.target.value),
                }),
              ),
              h('div', { className: 'tpds-field' },
                h('label', { className: 'tpds-label' }, 'API Key'),
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                  h('input', {
                    type: 'password',
                    className: 'tpds-input',
                    value: key,
                    autoComplete: 'new-password',
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
                    onClick: () => { setClearKey(true); setKey(''); },
                  }, 'Remove') : null,
                  clearKey ? h('button', {
                    type: 'button',
                    className: 'tpds-btn tpds-btn-sm',
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
              h('div', { className: 'tpds-field' },
                h('label', { className: 'tpds-label' }, 'Models'),
                models.map((m, idx) => h('div', { key: m._key, className: 'tpds-model-entry' },
                  h('input', {
                    className: 'tpds-input',
                    value: m.id,
                    placeholder: 'Model ID (e.g. deepseek/deepseek-chat)',
                    spellCheck: false,
                    onChange: e => editModel(idx, 'id', e.target.value),
                  }),
                  h('input', {
                    className: 'tpds-input',
                    value: m.name,
                    placeholder: 'Display Name',
                    spellCheck: false,
                    onChange: e => editModel(idx, 'name', e.target.value),
                  }),
                  h('div', { style: { display: 'flex', gap: '4px' } },
                    h('button', {
                      type: 'button',
                      className: 'tpds-btn tpds-btn-sm',
                      disabled: idx === 0,
                      title: 'Move up',
                      onClick: () => moveModel(idx, idx - 1),
                    }, '▲'),
                    h('button', {
                      type: 'button',
                      className: 'tpds-btn tpds-btn-sm',
                      disabled: idx === models.length - 1,
                      title: 'Move down',
                      onClick: () => moveModel(idx, idx + 1),
                    }, '▼'),
                    h('button', {
                      type: 'button',
                      className: 'tpds-btn tpds-btn-danger tpds-btn-sm',
                      title: 'Delete model',
                      onClick: () => setModels(curr => curr.filter((_, i) => i !== idx)),
                    }, '✕'),
                  ),
                )),
                h('button', {
                  type: 'button',
                  className: 'tpds-btn',
                  style: { justifySelf: 'start', marginTop: '4px' },
                  onClick: () => setModels(curr => [...curr, { _key: genKey(), id: '', name: '' }]),
                }, '+ Add model'),
              ),
              h('div', { className: 'tpds-actions' },
                h('button', {
                  type: 'button',
                  className: 'tpds-btn',
                  disabled: phase === 'saving',
                  onClick: () => { load().catch(() => {}); setOpen(false); },
                }, 'Cancel'),
                h('button', {
                  type: 'button',
                  className: 'tpds-btn tpds-btn-primary',
                  disabled: phase === 'saving',
                  onClick: () => { save().catch(() => {}); },
                }, phase === 'saving' ? 'Applying…' : 'Apply'),
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
