/**
 * @superinstance/agent-core - Types
 * Core types for the Agent SDK
 */

// ============================================
// EscalationEngine Types
// ============================================

export type RoutingTier = 'bot' | 'brain' | 'human';

export interface DecisionContext {
  id: string;
  situationType: string;
  description: string;
  stakes: number;
  urgencyMs: number;
  isNovel: boolean;
  metadata?: Record<string, unknown>;
}

export interface RoutingDecision {
  tier: RoutingTier;
  reason: string;
  confidenceRequired: number;
  estimatedCostUsd: number;
  estimatedTimeMs: number;
}

export interface EscalationConfig {
  botMinConfidence: number;
  brainMinConfidence: number;
  highStakesThreshold: number;
  urgentTimeMs: number;
  learningEnabled: boolean;
  costTrackingEnabled: boolean;
}

export interface CostMetrics {
  totalRequests: number;
  botRequests: number;
  brainRequests: number;
  humanRequests: number;
  totalCostUsd: number;
  savedCostUsd: number;
  averageLatencyMs: number;
}

// ============================================
// HierarchicalMemory Types
// ============================================

export type MemoryTier = 'working' | 'episodic' | 'semantic' | 'procedural';

export interface MemoryItem {
  id: string;
  content: string;
  importance: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tier: MemoryTier;
  embedding?: number[];
  metadata?: MemoryMetadata;
}

export interface MemoryMetadata {
  emotionalValence?: number;
  skillName?: string;
  masteryLevel?: number;
  tags?: string[];
  source?: string;
  relatedIds?: string[];
}

export interface MemorySearchOptions {
  query: string;
  mode: 'semantic' | 'temporal' | 'contextual' | 'hybrid';
  topK: number;
  tierFilter?: MemoryTier[];
  minImportance?: number;
  timeRange?: { start: number; end: number };
}

export interface MemorySearchResult {
  item: MemoryItem;
  relevanceScore: number;
  matchReason: string;
}

export interface MemoryStats {
  workingMemoryCount: number;
  workingMemoryCapacity: number;
  episodicMemoryCount: number;
  semanticMemoryCount: number;
  proceduralMemoryCount: number;
  totalConsolidations: number;
  averageImportance: number;
}

export interface HierarchicalMemoryConfig {
  workingMemoryCapacity: number;
  workingMemoryHalfLife: number;
  consolidationThreshold: number;
  emotionalThreshold: number;
  autoConsolidation: boolean;
  consolidationInterval: number;
}

// ============================================
// TripartiteConsensus Types
// ============================================

export type AgentRole = 'pathos' | 'logos' | 'ethos';
export type ConsensusDomain = 'factual' | 'emotional' | 'sensitive' | 'creative' | 'general';

export interface AgentVote {
  agent: AgentRole;
  proposal: string;
  confidence: number;
  reasoning: string;
  weight: number;
}

export interface ConsensusContext {
  query: string;
  domain: ConsensusDomain;
  threshold: number;
  maxRounds: number;
  metadata?: Record<string, unknown>;
}

export interface ConsensusResult {
  reached: boolean;
  decision: string;
  confidence: number;
  votes: AgentVote[];
  rounds: number;
  durationMs: number;
  reason: string;
}

export interface AgentConfig {
  role: AgentRole;
  baseWeight: number;
  systemPrompt: string;
}

export interface TripartiteConfig {
  defaultThreshold: number;
  maxRounds: number;
  agents: Record<AgentRole, AgentConfig>;
  parallelExecution: boolean;
  agentTimeoutMs: number;
}

// ============================================
// Unified Types
// ============================================

export interface AgentCoreConfig {
  escalation?: Partial<EscalationConfig>;
  memory?: Partial<HierarchicalMemoryConfig>;
  consensus?: Partial<TripartiteConfig>;
  debug?: boolean;
}

export interface AgentState {
  id: string;
  memory: MemoryStats;
  costs: CostMetrics;
  decisionsCount: number;
  lastActivity: number;
}

export interface AgentDecision {
  id: string;
  context: DecisionContext;
  routing: RoutingDecision;
  consensus?: ConsensusResult;
  output: string;
  timestamp: number;
  durationMs: number;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}
