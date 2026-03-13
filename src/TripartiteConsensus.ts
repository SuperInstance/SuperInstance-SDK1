/**
 * TripartiteConsensus - 3-Agent Cognitive Consensus System
 * 
 * Three specialized agents must agree:
 * - Pathos (Intent): "What does the user want?"
 * - Logos (Logic): "How do we accomplish this?"
 * - Ethos (Truth): "Is this safe and feasible?"
 */

import type {
  AgentRole,
  AgentVote,
  ConsensusContext,
  ConsensusResult,
  AgentConfig,
  TripartiteConfig,
  LLMConfig,
} from './types';

const DOMAIN_WEIGHTS: Record<string, Record<AgentRole, number>> = {
  factual: { pathos: 0.2, logos: 0.5, ethos: 0.3 },
  emotional: { pathos: 0.5, logos: 0.2, ethos: 0.3 },
  sensitive: { pathos: 0.2, logos: 0.2, ethos: 0.6 },
  creative: { pathos: 0.4, logos: 0.3, ethos: 0.3 },
  general: { pathos: 0.33, logos: 0.34, ethos: 0.33 },
};

const DEFAULT_PROMPTS: Record<AgentRole, string> = {
  pathos: 'You are Pathos, the empathy agent. Understand what the user truly wants.',
  logos: 'You are Logos, the logic agent. Determine the most rational approach.',
  ethos: 'You are Ethos, the ethics agent. Verify safety and accuracy.',
};

const DEFAULT_CONFIG: TripartiteConfig = {
  defaultThreshold: 0.8,
  maxRounds: 3,
  agents: {
    pathos: { role: 'pathos', baseWeight: 0.33, systemPrompt: DEFAULT_PROMPTS.pathos },
    logos: { role: 'logos', baseWeight: 0.34, systemPrompt: DEFAULT_PROMPTS.logos },
    ethos: { role: 'ethos', baseWeight: 0.33, systemPrompt: DEFAULT_PROMPTS.ethos },
  },
  parallelExecution: true,
  agentTimeoutMs: 30000,
};

export class TripartiteConsensus {
  private config: TripartiteConfig;
  private llmCallFn?: (prompt: string, systemPrompt: string, config?: LLMConfig) => Promise<string>;

  constructor(
    config: Partial<TripartiteConfig> = {},
    llmCallFn?: (prompt: string, systemPrompt: string, config?: LLMConfig) => Promise<string>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmCallFn = llmCallFn;
  }

  setLLMCallFn(fn: (prompt: string, systemPrompt: string, config?: LLMConfig) => Promise<string>): void {
    this.llmCallFn = fn;
  }

  async deliberate(context: ConsensusContext): Promise<ConsensusResult> {
    const startTime = Date.now();
    const threshold = context.threshold ?? this.config.defaultThreshold;
    const maxRounds = context.maxRounds ?? this.config.maxRounds;
    
    let votes: AgentVote[] = [];
    let round = 0;
    let consensusReached = false;
    let finalDecision = '';

    while (round < maxRounds && !consensusReached) {
      round++;
      votes = await this.gatherVotes(context, votes);
      
      const evaluation = this.evaluateConsensus(votes, threshold, context.domain);
      if (evaluation.reached) {
        consensusReached = true;
        finalDecision = evaluation.decision;
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      reached: consensusReached,
      decision: finalDecision || this.selectBestProposal(votes, context.domain),
      confidence: this.calculateOverallConfidence(votes),
      votes,
      rounds: round,
      durationMs,
      reason: consensusReached 
        ? `Consensus reached after ${round} round(s)`
        : `Selected best proposal after ${round} round(s)`,
    };
  }

  private async gatherVotes(context: ConsensusContext, previousVotes: AgentVote[]): Promise<AgentVote[]> {
    const roles: AgentRole[] = ['pathos', 'logos', 'ethos'];
    const votes: AgentVote[] = [];

    if (this.config.parallelExecution) {
      const promises = roles.map(role => this.getAgentVote(role, context, previousVotes));
      const results = await Promise.allSettled(promises);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const role = roles[i];
        if (result.status === 'fulfilled') {
          votes.push(result.value);
        } else {
          votes.push(this.createFallbackVote(role, result.reason));
        }
      }
    } else {
      for (const role of roles) {
        try {
          votes.push(await this.getAgentVote(role, context, previousVotes));
        } catch (error) {
          votes.push(this.createFallbackVote(role, error));
        }
      }
    }

    return votes;
  }

  private async getAgentVote(
    role: AgentRole,
    context: ConsensusContext,
    previousVotes: AgentVote[]
  ): Promise<AgentVote> {
    const agentConfig = this.config.agents[role];
    const weights = DOMAIN_WEIGHTS[context.domain] ?? DOMAIN_WEIGHTS.general!;
    
    const prompt = this.buildPrompt(context, previousVotes);
    
    let proposal = '';
    let confidence = 0.5;
    let reasoning = '';

    if (this.llmCallFn) {
      try {
        const response = await Promise.race([
          this.llmCallFn(prompt, agentConfig.systemPrompt),
          this.timeout(this.config.agentTimeoutMs),
        ]);
        const parsed = this.parseResponse(response);
        proposal = parsed.proposal;
        confidence = parsed.confidence;
        reasoning = parsed.reasoning;
      } catch {
        const heuristic = this.heuristicResponse(role, context);
        proposal = heuristic.proposal;
        confidence = heuristic.confidence;
        reasoning = heuristic.reasoning;
      }
    } else {
      const heuristic = this.heuristicResponse(role, context);
      proposal = heuristic.proposal;
      confidence = heuristic.confidence;
      reasoning = heuristic.reasoning;
    }

    return {
      agent: role,
      proposal,
      confidence,
      reasoning,
      weight: weights[role] ?? 0.33,
    };
  }

  private buildPrompt(context: ConsensusContext, previousVotes: AgentVote[]): string {
    let prompt = `Query: ${context.query}\nDomain: ${context.domain}\n`;
    
    if (previousVotes.length > 0) {
      prompt += `\nPrevious votes:\n`;
      previousVotes.forEach(v => {
        prompt += `- ${v.agent}: "${v.proposal}" (${(v.confidence * 100).toFixed(0)}%)\n`;
      });
      prompt += '\nConsider other perspectives.\n';
    }

    prompt += `\nRespond as:\nPROPOSAL: [your answer]\nCONFIDENCE: [0-1]\nREASONING: [why]`;
    return prompt;
  }

  private parseResponse(response: string): { proposal: string; confidence: number; reasoning: string } {
    const proposalMatch = response.match(/PROPOSAL:\s*(.+?)(?:\n|$)/i);
    const confidenceMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i);
    const reasoningMatch = response.match(/REASONING:\s*(.+?)(?:\n|$)/is);

    return {
      proposal: proposalMatch?.[1]?.trim() ?? response.slice(0, 100),
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
      reasoning: reasoningMatch?.[1]?.trim() ?? 'No reasoning provided',
    };
  }

  private heuristicResponse(role: AgentRole, context: ConsensusContext): { proposal: string; confidence: number; reasoning: string } {
    if (role === 'pathos') {
      return {
        proposal: `User intent: ${context.query}`,
        confidence: 0.5,
        reasoning: 'Heuristic intent analysis',
      };
    } else if (role === 'logos') {
      return {
        proposal: `Logical approach: process "${context.query}"`,
        confidence: 0.5,
        reasoning: 'Standard logical processing',
      };
    } else {
      const hasRisk = /delete|remove|dangerous|hack/i.test(context.query);
      return {
        proposal: hasRisk ? 'CAUTION: Potential risk' : 'No safety concerns',
        confidence: hasRisk ? 0.9 : 0.6,
        reasoning: hasRisk ? 'Risk keywords detected' : 'Safety check passed',
      };
    }
  }

  private createFallbackVote(role: AgentRole, error: unknown): AgentVote {
    const weights = DOMAIN_WEIGHTS.general!;
    return {
      agent: role,
      proposal: `[${role}] Error processing`,
      confidence: 0.1,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      weight: weights[role] ?? 0.33,
    };
  }

  private evaluateConsensus(
    votes: AgentVote[],
    threshold: number,
    domain: string
  ): { reached: boolean; decision: string } {
    if (votes.length < 3) return { reached: false, decision: '' };

    const weights = DOMAIN_WEIGHTS[domain] ?? DOMAIN_WEIGHTS.general!;
    let totalWeight = 0;
    let bestProposal = '';
    let bestScore = 0;

    const proposals = new Map<string, { votes: AgentVote[]; score: number }>();
    
    for (const vote of votes) {
      const normalized = vote.proposal.toLowerCase().trim();
      let found = false;
      
      for (const [key, value] of proposals) {
        if (this.areSimilar(key, normalized)) {
          value.votes.push(vote);
          value.score += vote.confidence * (weights[vote.agent] ?? 0.33);
          found = true;
          break;
        }
      }
      
      if (!found) {
        proposals.set(normalized, { 
          votes: [vote], 
          score: vote.confidence * (weights[vote.agent] ?? 0.33) 
        });
      }
    }

    for (const [, data] of proposals) {
      if (data.score > bestScore) {
        bestScore = data.score;
        const first = data.votes[0];
        bestProposal = first?.proposal ?? '';
      }
    }

    for (const role of ['pathos', 'logos', 'ethos'] as AgentRole[]) {
      totalWeight += weights[role] ?? 0.33;
    }

    const ratio = totalWeight > 0 ? bestScore / totalWeight : 0;
    
    return {
      reached: ratio >= threshold,
      decision: bestProposal,
    };
  }

  private areSimilar(a: string, b: string): boolean {
    if (a === b) return true;
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 && (intersection.size / union.size) > 0.5;
  }

  private selectBestProposal(votes: AgentVote[], domain: string): string {
    const weights = DOMAIN_WEIGHTS[domain] ?? DOMAIN_WEIGHTS.general!;
    
    let best = votes[0];
    let bestScore = 0;

    for (const vote of votes) {
      const score = vote.confidence * (weights[vote.agent] ?? 0.33);
      if (score > bestScore) {
        bestScore = score;
        best = vote;
      }
    }

    return best?.proposal ?? 'No decision';
  }

  private calculateOverallConfidence(votes: AgentVote[]): number {
    if (votes.length === 0) return 0;
    const sum = votes.reduce((acc, v) => acc + v.confidence * v.weight, 0);
    const total = votes.reduce((acc, v) => acc + v.weight, 0);
    return total > 0 ? sum / total : 0;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms);
    });
  }

  async quickCheck(query: string, domain: ConsensusContext['domain'] = 'general'): Promise<boolean> {
    const result = await this.deliberate({
      query,
      domain,
      threshold: this.config.defaultThreshold,
      maxRounds: 1,
    });
    return result.reached;
  }

  updateAgentConfig(role: AgentRole, config: Partial<AgentConfig>): void {
    this.config.agents[role] = { ...this.config.agents[role], ...config };
  }
}
