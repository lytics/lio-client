# Product Requirements Document

**Package:** `@lytics/lio-client`  
**Document Type:** Product Requirements  
**Status:** Approved for Implementation  
**Last Updated:** 2026-01-19

---

## Executive Summary

JavaScript/TypeScript SDK for the Lytics API, providing programmatic access to workflow orchestration, content enrichment, and schema introspection with a plugin architecture for ecosystem extensibility.

**Primary Value:** Enable JavaScript/TypeScript developers to integrate Lytics without building authentication, error handling, retries, and caching from scratch.

---

## Problem Statement

### Current State

Lytics provides a mature [Go SDK](https://github.com/lytics/go-lytics) with 10+ API modules, but lacks JavaScript/TypeScript equivalent. Integration developers face several challenges:

**Technical Gaps:**
- No npm package available for JavaScript/TypeScript projects
- Developers must implement auth, error handling, retries, and caching independently
- No type definitions for TypeScript projects
- Custom client implementation required for each application

**Ecosystem Impact:**
- Limited marketplace app development
- Reduced adoption in JavaScript/TypeScript ecosystem
- Higher integration costs for partners
- Lack of standardization across integrations

### Strategic Opportunity

Apply proven SDK patterns from jstag to build a generic JavaScript/TypeScript client:

- **Validated Architecture:** Plugin-based design already battle-tested in jstag
- **Ecosystem Gap:** Fill JavaScript/TypeScript coverage gap (Go SDK exists)
- **Integration Platform:** Enable marketplace apps (Contentstack, WordPress, custom apps)
- **Reference Implementation:** Go SDK provides API patterns and best practices

---

## Solution Overview

Generic JavaScript/TypeScript SDK with plugin architecture for extensibility.

### Core SDK

```typescript
// Generic Lytics API client
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({ apiKey: 'xxx' });
await lio.workflows.list();
await lio.content.getByUrl('example.com/blog');
await lio.schema.get('content');
```

### Plugin Ecosystem

```typescript
// CMS-specific integrations via plugins
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [contentstackPlugin()]
});

const enriched = await lio.contentstack.enrich(entry);
```

### Value Proposition

Developers can integrate Lytics in JavaScript/TypeScript without rebuilding authentication, error handling, retries, caching, or type definitions.

---

## Target Audience

### Primary: Integration Developers

**Profile:**
- Build applications that integrate with Lytics
- Use JavaScript/TypeScript as primary language
- Require type safety and IDE autocomplete
- Need reliable, production-ready client

**Current Pain:**
- No official JavaScript/TypeScript SDK
- Must build custom client for each project
- Lack of TypeScript types leads to runtime errors
- Maintenance burden for auth/retry/cache logic

**Solution Benefit:**
- Drop-in SDK with TypeScript support
- Production-ready error handling and retries
- Documented API patterns
- Reduced time-to-integration

### Secondary: Marketplace App Developers

**Profile:**
- Build CMS marketplace applications (Contentstack, WordPress, etc.)
- Enrich CMS content with Lytics data
- Display analytics within CMS interface
- Require CMS SDK compatibility

**Current Pain:**
- Context switching between CMS and Lytics dashboard
- Manual API integration for each CMS
- No standard patterns for enrichment

**Solution Benefit:**
- CMS-specific plugins (e.g., `@lytics/lio-client-contentstack`)
- Inline data display in CMS
- Bridge pattern preserves existing CMS SDK usage

### Tertiary: Automation & Script Users

**Profile:**
- Query Lytics from scheduled jobs or workflows
- Run in Node.js, serverless, or edge environments
- Require universal runtime compatibility

**Current Pain:**
- jstag is browser-only
- No server-side JavaScript solution

**Solution Benefit:**
- Universal client (browser, Node.js, edge)
- Suitable for CI/CD pipelines
- Works in Automate workflows

---

## Requirements

### Functional Requirements (MVP)

| Requirement | Priority | Description |
|------------|----------|-------------|
| Core API Access | P0 | Workflows, content, schema endpoints |
| Plugin Architecture | P0 | SDK Kit-based extensibility |
| TypeScript Support | P0 | Full type definitions and generics |
| Universal Runtime | P0 | Browser, Node.js, edge functions |
| Contentstack Plugin | P1 | Example CMS integration |

### Non-Functional Requirements

| Requirement | Target | Measurement |
|------------|--------|-------------|
| Bundle Size | <20KB gzipped | Core + essential plugins |
| API Latency | <200ms p95 | Client-side overhead only |
| Cache Hit Rate | >80% | With default TTLs |
| Error Rate | <1% | After retries |
| Type Coverage | 100% | All public APIs |

### Out of Scope (V1)

**Explicitly Not Included:**
- User tracking/analytics (use jstag for browser tracking)
- Segment management (complex API, future consideration)
- Campaign triggers (future consideration)
- Real-time personalization engine (use jstag)

**Rationale:** Focus on read-only API access for content enrichment use cases. Write operations and real-time features require different architectural patterns.

---

## Success Criteria

### Launch (Week 4)

| Metric | Target | Validation |
|--------|--------|------------|
| Core SDK Published | 1 package | npm registry |
| Plugin Availability | 1+ plugin | Contentstack plugin working |
| API Latency | <200ms p95 | Performance tests |
| Security Incidents | 0 | Security audit |

### 30 Days Post-Launch

| Metric | Target | Validation |
|--------|--------|------------|
| Active Integrations | 5+ | Usage analytics |
| Daily API Calls | 1,000+ | API logs |
| Error Rate | <1% | Error monitoring |
| Cache Hit Rate | >80% | Cache metrics |

### 90 Days Post-Launch

| Metric | Target | Validation |
|--------|--------|------------|
| Active Integrations | 20+ | Usage analytics |
| Developer NPS | >40 | Developer survey |
| Community Plugins | 2+ | npm registry search |
| Documentation Coverage | 100% | Public API docs |

---

## Dependencies & Blockers

### Critical Dependencies

| Dependency | Status | Risk | Mitigation |
|-----------|--------|------|-----------|
| SDK Kit v1.x | Available | Low | Stable, tested |
| Lytics API Stability | Stable | Low | Public, documented |
| Contentstack SDK | Compatible | Low | Peer dependency |

### Resolved Blockers

**Stream Query Endpoint:**
- **Status:** Resolved
- **Solution:** Use `/api/segment/scan` with ad-hoc SegmentQL
- **Example:** `FILTER EXISTS hashedurl FROM content`
- **Supports:** Pagination (100/page), field selection

### Open Issues

**contentstack_uid Field:**
- **Issue:** Present in schema but null in actual content
- **Impact:** Cannot use UID-based matching, must use URL matching
- **Owner:** Lytics platform team
- **Workaround:** URL-based matching (implemented)
- **Decision Date:** 2026-01-26

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Low Adoption | Medium | High | Strong documentation, examples, developer outreach |
| Bundle Size Bloat | Low | Medium | Lazy-load plugins, tree-shaking, size monitoring |
| Breaking API Changes | Low | High | Version pinning, deprecation policy |
| Support Burden | Medium | Medium | Community docs, GitHub Discussions |

---

## Non-Goals

**This SDK is NOT:**
- A user tracking solution (use jstag for analytics)
- A full Lytics platform replacement
- CMS-specific (core is generic, plugins add CMS features)
- A real-time personalization engine

**Scope:** Generic Lytics API SDK - extend with plugins for specific use cases.

---

## Open Questions

**Business & Strategy:**
1. **Pricing Model:** Is SDK usage free or usage-based?
2. **Support Commitment:** Which team handles GitHub issues and support requests?
3. **Versioning Policy:** What is the cadence for breaking changes?
4. **Community Plugins:** How to enable, validate, and promote community-contributed plugins?

**Technical:**
1. **Rate Limits:** Are there documented rate limits? What are they?
2. **API Roadmap:** Are there planned breaking changes to public APIs?
3. **Authentication:** Will header-based auth (Bearer tokens) be supported in future?

---

## Timeline

### Week 1: Foundation
- Resolve open blockers
- Set up monorepo infrastructure
- Configure build tooling and testing

### Weeks 2-3: Core Development
- Implement transport plugin (auth, envelope unwrapping)
- Build core plugins (workflows, content, schema)
- Develop Contentstack plugin
- Generate TypeScript type definitions

### Week 4: Integration & Testing
- Integrate with marketplace app
- End-to-end testing
- Performance benchmarking
- Documentation writing

### Week 5+: Launch & Iteration
- Public beta release
- Developer feedback collection
- Bug fixes and improvements
- v1.0 GA release

---

## Related Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [Technical Specification](./spec.md) | Implementation guide | Engineers |
| [API Reference](./api-discovery.md) | Endpoint documentation | Engineers |
| [Architecture Guide](./architecture.md) | Plugin design patterns | Engineers, Architects |
| [Non-Functional Requirements](./nfr.md) | Performance, security specs | Engineers, QA |

---

## Approval

**Product Owner:** Pros Seng  
**Status:** Approved  
**Date:** 2026-01-19
