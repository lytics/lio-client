---
description: Scaffold a new plugin package
argument-hint: <plugin-name>
---

# Add New Plugin

$1 plugin-name required: Create plugin package `@lytics/lio-client-$1`

---

## Steps

1. **Create package structure**:

!`mkdir -p packages/$1/src`

2. **Create package.json**:

!`cat > packages/$1/package.json << 'EOF'
{
  "name": "@lytics/lio-client-$1",
  "version": "0.1.0",
  "description": "$1 integration for lio-client",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "keywords": ["lytics", "$1", "sdk"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit",
    "lint": "biome lint ./src",
    "format": "biome format --write ./src",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "@lytics/lio-client": "workspace:*"
  },
  "devDependencies": {
    "@lytics/lio-client": "workspace:*",
    "tsup": "^8.5.1",
    "typescript": "^5.9.3"
  }
}
EOF`

3. **Create plugin scaffold**:

!`cat > packages/$1/src/plugin.ts << 'EOF'
import type { Plugin } from '@lytics/lio-client';

export const $1Plugin: Plugin = {
  name: '$1',
  // TODO: Implement SDK Kit plugin interface
};
EOF`

4. **Create types**:

!`cat > packages/$1/src/types.ts << 'EOF'
export interface $1Plugin {
  // TODO: Add plugin methods
}
EOF`

5. **Create index**:

!`cat > packages/$1/src/index.ts << 'EOF'
export { $1Plugin } from './plugin';
export type { $1Plugin as $1PluginType } from './types';
EOF`

6. **Copy configs**:

!`cp packages/core/tsconfig.json packages/$1/`
!`cp packages/core/tsup.config.ts packages/$1/`

7. **Create README**:

!`cat > packages/$1/README.md << 'EOF'
# @lytics/lio-client-$1

$1 integration plugin for [@lytics/lio-client](../core).

## Installation

\`\`\`bash
npm install @lytics/lio-client @lytics/lio-client-$1
\`\`\`

## Usage

\`\`\`typescript
import { createLioClient } from '@lytics/lio-client';
import { $1Plugin } from '@lytics/lio-client-$1';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [$1Plugin]
});

// TODO: Add usage examples
\`\`\`

## License

MIT
EOF`

---

**Plugin scaffolded!** Next steps:

1. Implement plugin logic in `packages/$1/src/plugin.ts`
2. Define interfaces in `packages/$1/src/types.ts`
3. Add tests in `packages/$1/src/__tests__/`
4. Update root README with new plugin
5. Run `pnpm install` to update lockfile

See @.claude/rules/architecture.md for plugin patterns.
