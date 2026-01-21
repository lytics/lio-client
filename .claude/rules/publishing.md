# Publishing lio-client with OIDC Trusted Publishing

## What is OIDC Trusted Publishing?

Instead of using long-lived `NPM_TOKEN` secrets, npm can authenticate GitHub Actions using OpenID Connect (OIDC). This is more secure and requires no secrets management.

## Setup Steps

### 1. Configure npm Packages (One-time setup)

For each package, configure trusted publishing on npm:

#### @lytics/lio-client
1. Go to https://www.npmjs.com/package/@lytics/lio-client/access
2. Click "Publishing Access" → "Automation"
3. Click "Add provider" under "Trusted publishers"
4. Fill in:
   - **Provider:** GitHub Actions
   - **GitHub organization:** lytics
   - **Repository name:** lio-client
   - **Workflow name:** release.yml
   - **Environment name:** (leave blank)
5. Click "Add"

#### @lytics/lio-client-contentstack
1. Go to https://www.npmjs.com/package/@lytics/lio-client-contentstack/access
2. Follow same steps as above
3. Same workflow: release.yml

### 2. Repository is Already Configured ✅

Our `.github/workflows/release.yml` already has:
```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: write  # For creating releases
  pull-requests: write  # For version PRs
```

### 3. Package.json Already Configured ✅

Both packages have:
```json
{
  "private": false,
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## First Publish (v0.1.0) - Manual

Since packages don't exist on npm yet, first publish must be manual:

```bash
# 1. Build packages
pnpm build

# 2. Publish core first (no dependencies)
cd packages/core
npm publish --provenance

# 3. Publish contentstack (depends on core)
cd ../contentstack
npm publish --provenance
```

**Note:** The `--provenance` flag creates a signed attestation linking the package to its source code and build.

## Subsequent Publishes - Automated with Changesets

After v0.1.0 is published:

```bash
# 1. Make changes
# 2. Create changeset
pnpm changeset

# 3. Select packages and version bump type
# Interactive prompts:
# - Which packages changed? (select with space)
# - What kind of change? (patch/minor/major)
# - Summary of changes

# 4. Commit changeset
git add .changeset/
git commit -m "chore: add changeset"

# 5. Push to main
git push origin main

# 6. CI runs and Changesets creates a "Version Packages" PR
# 7. Review and merge the PR
# 8. On merge, Release workflow publishes to npm automatically
```

## How Trusted Publishing Works

1. **GitHub Actions workflow runs** with `id-token: write` permission
2. **GitHub generates a temporary OIDC token** proving:
   - Repository: `lytics/lio-client`
   - Workflow: `release.yml`
   - Branch: `main`
3. **npm verifies the OIDC token** matches the configured trusted publisher
4. **npm grants publish permission** for that specific run
5. **Package publishes** with provenance attestation

## Security Benefits

- ✅ No long-lived tokens to leak
- ✅ No secrets to rotate
- ✅ Automatic expiration after workflow completes
- ✅ Provenance linking package to source code
- ✅ Auditable publish logs

## Troubleshooting

### "Unable to authenticate"
- Check npm trusted publisher configuration matches exactly:
  - Organization: `lytics`
  - Repository: `lio-client`
  - Workflow: `release.yml`

### "Package not found"
- First publish must be manual (npm doesn't know about the package yet)
- After first publish, automated publishing works

### "Permission denied"
- Ensure workflow has `id-token: write` permission
- Check npm package permissions (must be maintainer)

## Reference

- [npm Trusted Publishers](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC Tokens](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Changesets Documentation](https://github.com/changesets/changesets)
