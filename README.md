# @superinstance/agent-core

> **Minimal SDK combining 3 research breakthroughs for intelligent AI agents**

[![npm version](https://badge.fury.io/js/%40superinstance%2Fagent-core.svg)](https://www.npmjs.com/package/@superinstance/agent-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

This SDK packages three dissertation-worthy research breakthroughs into a minimal, developer-friendly library:

| Component | Breakthrough | Key Metric |
|-----------|--------------|------------|
| **EscalationEngine** | Intelligent LLM Routing | **40x cost reduction** |
| **HierarchicalMemory** | 4-Tier Cognitive Memory | Biologically-inspired |
| **TripartiteConsensus** | 3-Agent Deliberation | Reliable decisions |

## Installation

```bash
npm install @superinstance/agent-core
# or
bun add @superinstance/agent-core
```

## Quick Start

```typescript
import { AgentCore } from '@superinstance/agent-core';

// Create an agent
const agent = new AgentCore({
  escalation: { botMinConfidence: 0.75 },
  memory: { workingMemoryCapacity: 30 },
  debug: true,
});

// Add memories
agent.remember("User prefers dark mode");
agent.remember("User's timezone is PST");

// Learn skills
agent.learnSkill("greeting", "Greet user warmly by name if known");

// Make decisions with automatic routing
const result = await agent.decide("Should I enable dark mode?", {
  stakes: 0.2,  // Low stakes
  urgencyMs: 1000,  // Quick response needed
});

console.log(result.output);
console.log(`Routed to: ${result.routing.tier}`);
console.log(`Cost saved: ${agent.getCostReduction()}%`);
```

## Components

### 1. EscalationEngine - 40x Cost Reduction

Routes decisions through three tiers based on complexity:

```
┌─────────────────┐
│   Decision      │
└────────┬────────┘
         │
    ┌────▼────┐
    │ ROUTE?  │
    └────┬────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│  BOT  │ │ BRAIN │ │ HUMAN │
│ Rules │ │ Local │ │  API  │
│ $0    │ │ $0.01 │ │ $0.03 │
└───────┘ └───────┘ └───────┘
```

```typescript
import { EscalationEngine } from '@superinstance/agent-core';

const router = new EscalationEngine({
  botMinConfidence: 0.7,
  highStakesThreshold: 0.7,
});

const decision = router.route({
  id: 'req_123',
  situationType: 'customer_support',
  description: 'User wants to reset password',
  stakes: 0.2,
  urgencyMs: 5000,
  isNovel: false,
});

console.log(decision.tier);  // 'bot', 'brain', or 'human'
console.log(router.getCostReduction());  // e.g., 85%
```

### 2. HierarchicalMemory - 4-Tier Cognitive Memory

Biologically-inspired memory architecture:

```
┌─────────────────────────────────────────────┐
│            Hierarchical Memory              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────┐                       │
│  │  Working Memory  │  ← Fast, limited      │
│  │   (20 items)     │    Priority eviction  │
│  └────────┬─────────┘                       │
│           │ Consolidation                   │
│           ▼                                 │
│  ┌──────────────────┐                       │
│  │ Episodic Memory  │  ← Events, emotions   │
│  │  (1000 events)   │    Temporal context   │
│  └────────┬─────────┘                       │
│           │                                 │
│           ▼                                 │
│  ┌──────────────────┐                       │
│  │ Semantic Memory  │  ← Concepts, facts    │
│  │   (unlimited)    │    Vector search      │
│  └──────────────────┘                       │
│                                             │
│  ┌──────────────────┐                       │
│  │Procedural Memory │  ← Skills, mastery    │
│  │   (unlimited)    │    Practice tracking  │
│  └──────────────────┘                       │
│                                             │
└─────────────────────────────────────────────┘
```

```typescript
import { HierarchicalMemory } from '@superinstance/agent-core';

const memory = new HierarchicalMemory({
  workingMemoryCapacity: 20,
  autoConsolidation: true,
});

// Add memories
memory.add("User prefers dark mode", { tags: ['preference', 'ui'] });
memory.add("Important meeting at 3pm", { 
  emotionalValence: 0.5,  // Positive
  tags: ['event', 'meeting']
});

// Learn a skill
const skill = memory.addSkill("greeting", 
  "Greet user by name with appropriate formality based on time of day");

// Practice the skill
memory.practice(skill.id, true);  // Success

// Search memories
const results = memory.search({
  query: "user preferences",
  mode: 'hybrid',
  topK: 5,
});
```

### 3. TripartiteConsensus - Reliable AI Decisions

Three specialized agents must agree:

```
         Query
           │
           ▼
┌──────────────────────────────────┐
│      Tripartite Council          │
│                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐│
│  │ Pathos │ │  Logos │ │  Ethos ││
│  │ Intent │ │  Logic │ │  Truth ││
│  └───┬────┘ └───┬────┘ └───┬────┘│
│      └──────────┼──────────────┘│
│                  │              │
│         ┌────────▼────────┐     │
│         │   Consensus?    │     │
│         └─────────────────┘     │
└──────────────────────────────────┘
```

- **Pathos** (Intent): "What does the user actually want?"
- **Logos** (Logic): "How do we accomplish this?"
- **Ethos** (Truth): "Is this safe, accurate, and feasible?"

```typescript
import { TripartiteConsensus } from '@superinstance/agent-core';

const consensus = new TripartiteConsensus({
  defaultThreshold: 0.8,
  maxRounds: 3,
});

// Set your LLM function
consensus.setLLMFunction(async (prompt, systemPrompt) => {
  // Call your preferred LLM here
  return await yourLLM.generate({ prompt, systemPrompt });
});

// Run deliberation
const result = await consensus.deliberate({
  query: "Should I delete this user's account?",
  domain: 'sensitive',  // Ethos gets higher weight
  threshold: 0.9,       // Need high agreement
  maxRounds: 3,
});

console.log(result.reached);     // true/false
console.log(result.decision);    // Final agreed answer
console.log(result.confidence);  // Overall confidence
```

## API Reference

### AgentCore

```typescript
const agent = new AgentCore(config?: AgentCoreConfig);

// Decision making
await agent.decide(query: string, options?: Partial<DecisionContext>): Promise<AgentDecision>

// Memory
agent.remember(content: string, metadata?): MemoryItem
agent.recall(query: string, topK?: number): MemorySearchResult[]
agent.learnSkill(name: string, instructions: string): MemoryItem

// Consensus
agent.setLLMFunction(fn): void
await agent.deliberate(query: string, domain?): Promise<ConsensusResult>

// Metrics
agent.getCostReduction(): number
agent.getMetrics(): { costs, memory, decisions }
agent.getState(): AgentState

// Lifecycle
agent.reset(): void
agent.destroy(): void
```

### EscalationEngine

```typescript
const engine = new EscalationEngine(config?: Partial<EscalationConfig>);

engine.route(context: DecisionContext): RoutingDecision
engine.recordOutcome(id: string, correct: boolean, tier: RoutingTier): void
engine.addRule(situationType: string, tier: RoutingTier): void
engine.getMetrics(): CostMetrics
engine.getCostReduction(): number
```

### HierarchicalMemory

```typescript
const memory = new HierarchicalMemory(config?: Partial<HierarchicalMemoryConfig>);

memory.add(content: string, metadata?: MemoryMetadata): MemoryItem
memory.get(id: string): MemoryItem | undefined
memory.search(options: MemorySearchOptions): MemorySearchResult[]
memory.addSkill(name: string, content: string, difficulty?): MemoryItem
memory.practice(skillId: string, success: boolean): number
memory.consolidate(): number
memory.getStats(): MemoryStats
```

### TripartiteConsensus

```typescript
const consensus = new TripartiteConsensus(config?: Partial<TripartiteConfig>, llmCallFn?);

consensus.setLLMCallFn(fn): void
await consensus.deliberate(context: ConsensusContext): Promise<ConsensusResult>
await consensus.quickCheck(query: string, domain?): Promise<boolean>
```

## Research Background

This SDK implements three research breakthroughs from the SuperInstance ecosystem:

1. **EscalationEngine**: Based on research showing 40x cost reduction through intelligent routing (Bot → Brain → Human)
2. **HierarchicalMemory**: Biologically-inspired 4-tier architecture mapping to human cognitive systems
3. **TripartiteConsensus**: Novel application of distributed consensus to cognitive architectures

See the [SuperInstance Research](https://github.com/SuperInstance/CRDT_Research) for full dissertation materials.

## License

MIT © SuperInstance
