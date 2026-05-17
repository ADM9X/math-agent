# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"数学小探险" (Math Adventure) - A pure frontend Web-based intelligent math tutoring system for elementary school students, powered by DeepSeek LLM. Zero framework dependencies, runs directly in browser.

**Run**: `cd math-agent && python3 -m http.server 8080` then open http://localhost:8080

## Architecture

```
index.html → loads js/ in order:
├── config.js          # API key and endpoint configuration
├── canvas-engine.js   # Shared Canvas engine (coordinates, drag, animation)
├── main.js            # State management (AppState, ModuleRegistry), module switching
├── llm-client.js      # DeepSeek API client + System Prompts for each module
├── ui/chat.js         # Chat panel UI
├── ui/toolbar.js      # Bottom toolbar UI
└── modules/
    ├── geometry.js    # 2D/3D shape exploration (drag vertices, real-time angles/sides)
    ├── fraction.js    # Fraction recognition (circle/rect slicing, numerator/denominator)
    ├── transform.js   # Translation/rotation/reflection (grid, rotation handle)
    └── segment.js     # Segment diagrams (drag lengths, ratio display)
```

## Module System

Each module registers via `registerModule(name, { init, destroy, getState, getHelp })`. Modules are switched via `switchModule(name)` in `main.js` which calls the previous module's `destroyFn` and the new module's `initFn`.

**Module communication**: Modules read/write to `AppState.context` which is passed to LLM. Call `sendToLLM(message)` in `llm-client.js` to trigger AI responses.

## Key Files

- `js/canvas-engine.js` - Core rendering engine; all modules use this for drawing
- `js/llm-client.js` - Contains 4 tailored System Prompts (Socratic guiding style)
- `js/modules/geometry.js` - Most complex module; includes 3D wireframe rendering with isometric projection
- `js/main.js` - Global state and module lifecycle management

## Development Notes

- Script loading order matters: modules must be loaded AFTER `main.js` but their `initFn` is called after
- Canvas uses `requestAnimationFrame` for animation loop
- Touch and mouse events both supported via `canvas-engine.js`
- API Key stored in `config.js` - do not commit to version control if public