/**
 * @superinstance/agent-core
 * 
 * Minimal SDK combining three research breakthroughs:
 * - EscalationEngine: 40x cost reduction through intelligent LLM routing
 * - HierarchicalMemory: 4-tier cognitive memory architecture
 * - TripartiteConsensus: Reliable AI decisions through 3-agent deliberation
 */

import { EscalationEngine } from './EscalationEngine';
import { HierarchicalMemory } from './HierarchicalMemory';
import { TripartiteConsensus } from './TripartiteConsensus';

import type {
  AgentCoreConfig,
  AgentState,
  AgentDecision,
  DecisionContext,
  ConsensusResult,
  MemoryItem,
  MemorySearchResult,
  MemoryStats,
  CostMetrics,
  ConsensusContext,
  LLMConfig,
} from './types';

export type {
  AgentCoreConfig,
  AgentState,
  AgentDecision,
  DecisionContext,
  ConsensusResult,
  MemoryItem,
  MemorySearchResult,
  MemoryStats,
  CostMetrics,
  ConsensusContext,
  LLMConfig,
  RoutingTier,
  MemoryTier,
  AgentRole,
} from './types';

export { EscalationEngine } from './EscalationEngine';
export { HierarchicalMemory } from './HierarchicalMemory';
export { TripartiteConsensus } from './TripartiteConsensus';

/**
 * Main AgentCore class - unified interface to all components
 */
export class AgentCore {
  private escalation: EscalationEngine;
  private memory: HierarchicalMemory;
  private consensus: TripartiteConsensus;
  private decisions: AgentDecision[];
  private id: string;
  private debug: boolean;

  constructor(config: AgentCoreConfig = {}) {
    this.id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.debug = config.debug ?? false;
    this.decisions = [];

    this.escalation = new EscalationEngine(config.escalation);
    this.memory = new HierarchicalMemory(config.memory);
    this.consensus = new TripartiteConsensus(config.consensus);

    this.log('AgentCore initialized', { id: this.id });
  }

  // ============================================
  // Decision Making
  // ============================================

  async decide(
    query: string,
    options: Partial<DecisionContext> = {}
  ): Promise<AgentDecision> {
    const startTime = Date.now();
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const context: DecisionContext = {
      id: decisionId,
      situationType: options.situationType ?? 'general',
      description: query,
      stakes: options.stakes ?? 0.5,
      urgencyMs: options.urgencyMs ?? 5000,
      isNovel: options.isNovel ?? this.isNovel(query),
      metadata: options.metadata,
    };

    const routing = this.escalation.route(context);
    this.log('Routing decision', { tier: routing.tier, reason: routing.reason });

    let output: string;
    let consensusResult: ConsensusResult | undefined;

    if (routing.tier === 'human' || context.stakes >= 0.7) {
      consensusResult = await this.consensus.deliberate({
        query,
        domain: this.inferDomain(query),
        threshold: 0.8,
        maxRounds: 3,
      });
      output = consensusResult.decision;
    } else {
      const results = this.memory.search({ query, mode: 'hybrid', topK: 3 });
      
      if (results.length > 0 && routing.tier === 'bot') {
        const relevant = results.map(r => r.item.content).join('; ');
        output = `Based on knowledge: ${relevant}`;
      } else {
        output = `[${routing.tier.toUpperCase()}] Response to: ${query}`;
      }
    }

    const decision: AgentDecision = {
      id: decisionId,
      context,
      routing,
      consensus: consensusResult,
      output,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
    };

    this.decisions.push(decision);
    this.memory.add(`Decision: ${query} → ${output.slice(0, 100)}`, {
      tags: ['decision', context.situationType],
    });

    return decision;
  }

  private isNovel(query: string): boolean {
    const results = this.memory.search({ query, mode: 'hybrid', topK: 1 });
    return results.length === 0 || results[0].relevanceScore < 0.7;
  }

  private inferDomain(query: string): ConsensusContext['domain'] {
    const lower = query.toLowerCase();
    
    if (/feel|emotion|want|wish|love|hate|happy|sad/i.test(lower)) return 'emotional';
    if (/dangerous|risk|safe|security|private|secret/i.test(lower)) return 'sensitive';
    if (/create|write|design|imagine|invent/i.test(lower)) return 'creative';
    if (/what|when|where|who|how many|fact/i.test(lower)) return 'factual';
    return 'general';
  }

  // ============================================
  // Memory Operations
  // ============================================

  remember(content: string, metadata?: Record<string, unknown>): MemoryItem {
    this.log('Adding memory', { content: content.slice(0, 50) });
    return this.memory.add(content, metadata as any);
  }

  recall(query: string, topK: number = 5): MemorySearchResult[] {
    return this.memory.search({ query, mode: 'hybrid', topK });
  }

  learnSkill(name: string, instructions: string): MemoryItem {
    this.log('Learning skill', { name });
    return this.memory.addSkill(name, instructions);
  }

  practice(skillId: string, success: boolean): number {
    return this.memory.practice(skillId, success);
  }

  // ============================================
  // Consensus Operations
  // ============================================

  setLLMFunction(fn: (prompt: string, systemPrompt: string, config?: LLMConfig) => Promise<string>): void {
    this.consensus.setLLMCallFn(fn);
  }

  async deliberate(query: string, domain: ConsensusContext['domain'] = 'general'): Promise<ConsensusResult> {
    return this.consensus.deliberate({
      query,
      domain,
      threshold: 0.8,
      maxRounds: 3,
    });
  }

  // ============================================
  // Metrics
  // ============================================

  getCostReduction(): number {
    return this.escalation.getCostReduction();
  }

  getMetrics(): { costs: CostMetrics; memory: MemoryStats; decisions: number } {
    return {
      costs: this.escalation.getMetrics(),
      memory: this.memory.getStats(),
      decisions: this.decisions.length,
    };
  }

  getState(): AgentState {
    return {
      id: this.id,
      memory: this.memory.getStats(),
      costs: this.escalation.getMetrics(),
      decisionsCount: this.decisions.length,
      lastActivity: Date.now(),
    };
  }

  // ============================================
  // Knowledge Sharing
  // ============================================

  exportKnowledge(): ReturnType<AgentCore['memory']['exportPack']> {
    return this.memory.exportPack();
  }

  importKnowledge(pack: ReturnType<AgentCore['memory']['exportPack']>, trustLevel: number = 0.5): number {
    this.log('Importing knowledge', { itemCount: pack.items.length, trustLevel });
    return this.memory.importPack(pack, trustLevel);
  }

  // ============================================
  // Lifecycle
  // ============================================

  reset(): void {
    this.escalation.reset();
    this.memory.clear();
    this.decisions = [];
    this.log('Agent reset');
  }

  destroy(): void {
    this.memory.destroy();
    this.log('Agent destroyed');
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      console.log(`[AgentCore] ${message}`, data ?? '');
    }
  }
}

export default AgentCore;
