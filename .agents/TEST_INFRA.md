# E2E Test Infra: 85-Template Resume Catalog

## Test Philosophy
- Opaque-box, requirement-driven. Direct empirical verification of rendered DOM strings across empty, partial, and full payloads.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Attribute Checking + Multi-Engine Parity.

## Feature Inventory & Test Coverage
| # | Feature Area | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary & Empty) | Tier 3 (Attribute Parity) | Tier 4 (Full Payload) |
|---|--------------|-------------|:-----------------:|:-------------------------:|:-------------------------:|:---------------------:|
| 1 | 85-Template Generators | Loadability & Rendering | 85 tests | 85 tests | 85 tests | 85 tests |
| 2 | Zero Mock Fallbacks | R1: No mock resurrection | - | 85 tests (empty payload) | - | - |
| 3 | No Ghost Headers | R1: Clean empty sections | - | 85 tests (empty contact/sections) | - | - |
| 4 | WYSIWYG Stamping | R3: Canonical `data-df-field` | - | - | 85 tests (full payload) | - |
| 5 | Avatar Masking | R4: Masking wrappers | - | - | 85 tests (photo templates) | - |
| 6 | Discrete A4 Bounds & Print | R2 & R3: `.cv-page` & styles | 85 tests | - | - | 85 tests |

## Test Architecture
- **Test Runner**: `node tests/frontend/test_template_catalog_matrix.mjs`
- **Output Format**: Structured JSON & console test summary with exact pass/fail counts, assertion density, and flaw reports.
- **Pass Criteria**: 100% assertions passing across all 85 templates. Zero mock data strings, zero duplicate tags, zero ghost headers.

## Coverage Thresholds
- Tier 1: 85 template loadability and rendering sanity checks.
- Tier 2: 85 empty payload zero-mock-data checks and ghost-header suppression assertions.
- Tier 3: 85 canonical WYSIWYG `data-df-field` stamping, deduplication, and avatar mask checks.
- Tier 4: 85 full multi-section payload rendering, vector geometry, and print-style assertions.
- **Total Assertions: >340 deterministic checks (well above the 30–100 invariant)**.
