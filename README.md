# JARVIS — personal assistant for macOS

Milestone 1 is a local React + TypeScript command center connected to a Python FastAPI backend. Milestones 2.1–2.2 add real conversations through OpenAI Responses or a local Ollama model. Ollama requires no API key; the default `auto` mode preserves OpenAI-with-key / mock-without-key behavior. Voice, integrations, persistent memory, and computer actions remain unavailable.

## Milestone 1 checklist

- [x] React + TypeScript + Vite interface with responsive holographic styling
- [x] Backend health and assistant status, displayed from live API responses
- [x] On-demand conversation window connected to the assistant endpoint
- [x] Serbian/English selector, local UI commands, and assistant responses
- [x] Disabled microphone control, real connection status, session command history
- [x] Environment configuration, JSON request logging, backend and frontend tests
- [x] Modular service boundary and macOS installation instructions
- [ ] Validate natively on macOS (cloud development host is Linux)

## Structure

```text
backend/
  app/             # config, JSON logging, API routes, Ollama/OpenAI/mock assistant service
  tests/           # endpoint, validation, CORS and configuration tests
  requirements.txt
frontend/
  src/
    components/    # SVG core, HUD panels, command console, holographic windows
    hooks/         # session/API state, window management, visibility
    styles/        # core motion and rendering styles
    commands.ts    # deterministic English/Serbian UI intent parser
    api.ts         # existing typed API client
    copy.ts        # English/Serbian interface copy
  package-lock.json
```

The assistant service contains the server-side OpenAI provider boundary. Add speech, memory, and computer automation as separate services; automation will need explicit user approval before executing actions. Milestone 1 does not expose an action execution endpoint.

## Minimal holographic command center

![Minimal JARVIS home captured from the running application](docs/minimal-home.png)

The permanent centerpiece is a large animated SVG intelligence core with segmented rings, orbital paths, radial ticks, geometric structures, and 180 procedural particles. Four compact HUD panels show local time/date, messaging availability, email availability, and real backend/provider status. The browser uses your Mac’s local timezone. Messages and email show **Not connected** without fabricated content or unread counts.

There is no permanent sidebar or chat window. Use the text console to summon modules:

| English | Serbian | Result |
| --- | --- | --- |
| Jarvis, bring up my task list. | Jarvise, prikaži zadatke. | Open Task Manager |
| Jarvis, show my calendar. | Jarvise, otvori kalendar. | Open Calendar |
| Jarvis, display my emails. | Jarvise, prikaži mejlove. | Expand email window |
| Jarvis, show my conversations. | Jarvise, prikaži razgovore. | Show session chat and command history |
| Jarvis, open settings. | Jarvise, otvori podešavanja. | Open settings |
| Jarvis, close the task list. | Jarvise, zatvori zadatke. | Close Task Manager |
| Jarvis, close all windows. | Jarvise, zatvori sve prozore. | Restore minimal home |

Known UI commands use a deterministic allowlist locally, including while the backend is offline. Unknown text uses the existing assistant endpoint; commands never execute JavaScript, shell commands, or computer actions. Serbian Cyrillic is also supported. Future speech-to-text can feed this same validated router; voice recognition is not implemented and the microphone button is disabled.

Windows support focus, close, minimize/restore, multiple open modules, and desktop dragging/resizing within the visible stage. Focus the title or resize handle and use arrow keys (Shift for larger steps) as keyboard alternatives. Smaller screens stack windows below the core. Opening and closing use approximately 320 ms holographic assembly transitions. A compact top menu also summons windows, and settings provide motion and integration-preview privacy controls. Integration previews default to private; no authenticated integration data is available yet.

![On-demand windows leave the JARVIS core visible](docs/on-demand-windows.png)

Conversations retain the existing session messages, safe code rendering, timestamps, and command history until page reload. An assistant reply briefly appears above the console; open Conversations to review it afterward. Tasks, calendar, email, messages, agents, memory, tools, and workflows are honest availability views: no storage, integrations, or automation have been added.

The core reflects idle, processing, responding, and error/offline states. A separate listening visual state is reserved for future integration. **Command-K** (Control-K also works) focuses the command input; **Enter** submits. Animations respect reduced-motion preferences, can be disabled in settings, and pause with health polling when the tab is hidden. The particle field is decorative geometry, not live model telemetry. Fonts are bundled locally.

## Run on your Mac

Prerequisites: Git, Python **3.11+**, and Node.js **22.12+** with npm. If using Homebrew, `brew install python@3.12 node` installs suitable runtimes. Use the Python from Homebrew rather than relying on Apple's system Python.

```bash
git clone https://github.com/udiicc/Jarvis-ai.git
cd Jarvis-ai
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
```

If you already have a checkout, use it instead of cloning again. These implementation changes must be in your checkout before the commands above can run.

Terminal 1, from the repository root:

```bash
source .venv/bin/activate
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2, from the repository root:

```bash
cd frontend
npm run dev
```

Once the servers are running on your Mac, open `http://localhost:5173`. The backend API documentation is at `http://127.0.0.1:8000/docs`. Stop each server with Control-C. The UI checks backend health every 10 seconds; if offline, backend chat is disabled while local window commands remain available. A failed chat request is reported in the UI and command history.

## Milestone 2.2: local Ollama on your Mac

For your existing `~/Downloads/Jarvis-latest` checkout, stop the frontend and backend with Control-C, then:

```bash
cd ~/Downloads/Jarvis-latest
git pull --ff-only origin main
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
test -f backend/.env || cp backend/.env.example backend/.env
chmod 600 backend/.env
nano backend/.env
```

Set these values in `backend/.env`, replacing any existing entries for the same variables:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT_SECONDS=120
```

Save with Control-O, Enter, Control-X. No OpenAI key is needed. An existing key can stay in this backend-only file; Ollama mode never initializes OpenAI or falls back to it. Exported environment variables take precedence: in your backend terminal run the following to use the file instead:

```bash
unset AI_PROVIDER OLLAMA_BASE_URL OLLAMA_MODEL OLLAMA_TIMEOUT_SECONDS
```

Activate your already-installed Ollama app and verify the already-downloaded model:

```bash
open -a Ollama
ollama list
curl --fail http://127.0.0.1:11434/api/tags
```

`ollama list` must include `qwen3:4b`. JARVIS never downloads, switches, or pulls models. If Ollama is already running, keep using that process. If you use the CLI rather than the Mac app, run `OLLAMA_HOST=127.0.0.1:11434 ollama serve` in a separate terminal **instead of** launching the app. Keep Ollama bound to loopback; do not publish or forward port 11434. A recent Ollama version supporting `think: false` is required.

Start the backend:

```bash
cd ~/Downloads/Jarvis-latest
source .venv/bin/activate
unset AI_PROVIDER OLLAMA_BASE_URL OLLAMA_MODEL OLLAMA_TIMEOUT_SECONDS
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal, start the frontend:

```bash
cd ~/Downloads/Jarvis-latest/frontend
npm run dev
```

Now open `http://localhost:5173` **on your Mac**, where these servers are running. The system panel shows `qwen3:4b` and **Ollama ready** after the local installed-model check. A completed conversation changes it to **Ollama verified**. Try “Zdravo, ja sam Ana” followed by “Kako se zovem?”. English works too. Deterministic window commands still bypass inference.

On the MacBook Air M2 with 8 GB RAM, JARVIS uses one request at a time, a 4,096-token model context, at most 512 generated tokens, and a two-minute keep-alive. The shared recent-history bound remains 12 messages / 12,000 characters plus the current input. Close other memory-heavy applications if inference is slow. `OLLAMA_TIMEOUT_SECONDS` defaults to 120 and accepts 10–300 seconds; the browser allows up to 310 seconds. Change the timeout and restart the backend if needed. The existing per-process request budget also applies locally.

Ollama uses native `/api/chat` with `stream: false` and `think: false`. Only the final `message.content` is returned; `message.thinking` is discarded. Defensive handling removes complete legacy `<think>` blocks and rejects incomplete thinking-only output. Missing models, offline Ollama, network errors, timeouts, and unusable replies produce explicit errors without paid-provider fallback. The client disables environment proxies and redirects, accepts only literal HTTP loopback addresses, rejects cloud model tags/remote model metadata, and never supplies tools. Keep the configured model local; JARVIS does not enable remote Ollama services.

Provider choices in `backend/.env`:

| AI_PROVIDER | Behavior |
| --- | --- |
| ollama | Local Ollama only; no key required and no OpenAI fallback |
| openai | OpenAI only; requires a key; reports an error when missing |
| mock | Explicit offline demo responses |
| auto | Compatibility default: OpenAI with a key, otherwise mock |

Changing providers/models requires a backend restart; reload the browser to start a fresh conversation context. Health checks do not run inference. Ollama status checks query only local installed-model metadata, distinguish readiness from a successful conversation, and do not download anything.

Validation: **49 backend tests**, **41 frontend tests**, TypeScript checks, and production build passed. Ollama tests mock its native HTTP responses, including English/Serbian instructions, bounded context, thinking separation, cloud-model rejection, no-key operation, failure recovery, timeouts, and provider isolation. All existing OpenAI and UI tests also pass. Actual M2 inference and native Safari must be verified on your Mac; this cloud container cannot reach your Mac’s loopback Ollama service.

## Milestone 2.1: configure real AI on macOS

From your existing checkout, stop both running servers with Control-C, then update and install:

```bash
git pull --ff-only origin main
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
```

Create a backend-only local configuration file without overwriting an existing one:

```bash
test -f backend/.env || cp backend/.env.example backend/.env
chmod 600 backend/.env
nano backend/.env
```

Create an API key at https://platform.openai.com/api-keys. In the editor, set `OPENAI_API_KEY` to your key, and save with Control-O, Enter, Control-X. Enter the key in this file rather than a terminal command, chat, screenshot, or frontend configuration. The file is Git-ignored. Leave the key blank for mock mode. If an exported `OPENAI_API_KEY` already exists, it takes precedence over the file; use `unset OPENAI_API_KEY` to use the file instead.

Select the model with `OPENAI_MODEL=gpt-4.1-mini` in the same file. This is the default for interactive conversation; choose another Responses-compatible model available to your OpenAI project if desired. Restart the backend after any configuration changes. OpenAI API billing/quota is separate from ChatGPT subscriptions.

Restart in two terminals, each initially at the repository root:

```bash
# Terminal 1
source .venv/bin/activate
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```bash
# Terminal 2
cd frontend
npm run dev
```

When running on your Mac, open `http://localhost:5173`. Submit a regular conversational message, such as “Zdravo, ja sam Ana”, then “Kako se zovem?”. Local window commands remain free of AI calls. The existing holographic layout and animations are unchanged.

The status panel distinguishes **Mock / local**, **OpenAI configured** (not tested), **Processing**, **OpenAI verified** (a successful response in this backend process), and provider errors. “Verified” records a completed request, not a continuously tested connection. Health/status checks never contact OpenAI. After a configured request fails, JARVIS shows an understandable error and never silently returns a mock reply.

`JARVIS_SYSTEM_INSTRUCTION` customizes the assistant identity. `OPENAI_TIMEOUT_SECONDS` defaults to 25 (range 1–45); `OPENAI_MAX_OUTPUT_TOKENS` defaults to 800 (range 32–4096); `JARVIS_REQUESTS_PER_MINUTE` defaults to 10 (range 1–60). One AI request runs at a time per backend process, with no automatic retries. These controls reduce accidental usage; they are not authentication or a hard financial cap. Use OpenAI project billing controls as well and keep this personal application local. Multiple backend workers each have their own request budget.

Only successful chat exchanges enter conversation context. For both AI providers, the browser retains up to 12 recent context messages; the backend sends at most 12,000 historical characters plus the current message (maximum 2,000). Reloading clears session history/context. The backend does not persist conversations. In OpenAI mode it uses `store=False` without server-side conversation IDs. OpenAI-mode requests transmit text/context to OpenAI; OpenAI’s applicable data-retention policies still apply. Request logs exclude message bodies, keys, and provider exception text. No tools, files, shell execution, or computer controls are provided to the model.

All AI validation in this milestone uses mocks, including an HTTP transport test through the official SDK. Live authenticated/model access and native macOS/Safari remain to be verified with your key on your Mac.

## Configuration

Defaults work without any environment files. The browser uses same-origin /api requests through Vite. This also supports a forwarded frontend when the hosting platform provides forwarding; this Codex onboarding environment does not expose a public Web preview. For a separately deployed backend address:

```bash
cp frontend/.env.example frontend/.env.local
# Edit VITE_API_BASE_URL, then restart Vite.
```

Frontend variables are public; never place secrets in `VITE_` variables. `backend/.env.example` documents configuration. `backend/.env` is loaded automatically; exported environment variables take precedence. For example, in Terminal 1 before starting the backend:

```bash
export JARVIS_LOG_LEVEL=INFO
export JARVIS_ALLOWED_ORIGINS='http://localhost:5173,http://127.0.0.1:5173'
```

JSON backend logs go to stderr and include request method, path, status, and duration. They exclude chat bodies. CORS permits the configured local frontend origins. The backend binds to loopback. Vite listens on 0.0.0.0:5173 and proxies /api to the backend, so remote previews need only frontend port 5173. This is a development foundation, not a public deployment with authentication. Avoid exposing it on untrusted networks.

## Verification

From the repository root:

```bash
(cd backend && ../.venv/bin/python -m pytest -q)
npm test --prefix frontend
npm run build --prefix frontend
curl --fail http://127.0.0.1:8000/api/health
curl --fail http://127.0.0.1:8000/api/assistant/status
curl --fail http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Zdravo","language":"sr"}'
```

The API requests require the backend to be running. Test installation with `npm ci`, which uses the committed lockfile. Chat and command history live only in browser state and clear on reload. Telemetry describes application capabilities and session events, not Mac CPU or memory usage. Voice, persistent memory, and approved automation belong to later milestones.

### Redesign validation

Frontend tests cover Ollama model/provider status and the minimal default layout, hidden modules, English/Serbian command routing, window state and keyboard controls, retained chat/history, language, offline and failure behavior, request states, manual recovery, motion controls, and safe code rendering. Backend tests also cover Responses API calls with mocked SDK/HTTP responses, language instructions, context bounds, missing-key fallback, authentication/timeouts/rate limits/network/unexpected failures, recovery, secret redaction, and usage limits. Tests isolate local credentials and never make billed API calls.

Validation passed: **41 frontend tests**, **49 backend tests**, TypeScript checks, and the production build. Chromium checks at 1440×900, 1280×800, 1920×1080, 1024×768, 800×800, and 390×844 found no horizontal overflow. Browser checks exercised local commands without backend requests, real English/Serbian mock chat, window dragging/clamping, resizing, minimize/restore, close-all, mobile stacking, the local timezone clock, reduced motion, and opening windows with motion disabled. Native macOS/Safari testing remains outstanding.
