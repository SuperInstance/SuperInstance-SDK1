/**
 * EscalationEngine - Intelligent LLM Routing for 40x Cost Reduction
 * 
 * Routes decisions through three tiers: Bot (rules, free) → Brain (local LLM) → Human (API LLM)
 */

import type {
  RoutingTier,
  DecisionContext,
  RoutingDecision,
  EscalationConfig,
  CostMetrics,
} from './types';

const DEFAULT_CONFIG: EscalationConfig = {
  botMinConfidence: 0.7,
  brainMinConfidence: 0.5,
  highStakesThreshold: 0.7,
  urgentTimeMs: 100,
  learningEnabled: true,
  costTrackingEnabled: true,
};

const COST_ESTIMATES = {
  bot: 0,
  brain: 0.0001,
  human: 0.03,
};

const LATENCY_ESTIMATES = {
  bot: 1,
  brain: 500,
  human: 2000,
};

export class EscalationEngine {
  private config: EscalationConfig;
  private metrics: CostMetrics;
  private outcomeHistory: Map<string, { correct: boolean; tier: RoutingTier }>;
  private patternRules: Map<string, RoutingTier>;

  constructor(config: Partial<EscalationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalRequests: 0,
      botRequests: 0,
      brainRequests: 0,
      humanRequests: 0,
      totalCostUsd: 0,
      savedCostUsd: 0,
      averageLatencyMs: 0,
    };
    this.outcomeHistory = new Map();
    this.patternRules = new Map();
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const botPatterns = ['password_reset', 'greeting', 'faq_simple', 'status_check', 'list_items'];
    const humanPatterns = ['legal_advice', 'medical_diagnosis', 'financial_decision', 'security_incident'];
    
    botPatterns.forEach(p => this.patternRules.set(p, 'bot'));
    humanPatterns.forEach(p => this.patternRules.set(p, 'human'));
  }

  route(context: DecisionContext): RoutingDecision {
    this.metrics.totalRequests++;

    const patternTier = this.patternRules.get(context.situationType);
    if (patternTier) {
      return this.createDecision(patternTier, 'Matched pattern rule');
    }

    const routingScore = this.calculateRoutingScore(context);
    
    let tier: RoutingTier;
    let reason: string;

    if (context.stakes >= this.config.highStakesThreshold) {
      tier = 'human';
      reason = `High stakes (${context.stakes.toFixed(2)}) exceeds threshold`;
    } else if (context.urgencyMs <= this.config.urgentTimeMs) {
      tier = 'bot';
      reason = `Urgent request (${context.urgencyMs}ms) requires fast response`;
    } else if (!context.isNovel && routingScore >= this.config.botMinConfidence) {
      tier = 'bot';
      reason = `Known pattern with high confidence (${routingScore.toFixed(2)})`;
    } else if (routingScore >= this.config.brainMinConfidence) {
      tier = 'brain';
      reason = `Medium confidence (${routingScore.toFixed(2)}) suitable for local model`;
    } else {
      tier = 'human';
      reason = `Low confidence (${routingScore.toFixed(2)}) requires expert judgment`;
    }

    this.updateMetrics(tier);
    return this.createDecision(tier, reason);
  }

  private calculateRoutingScore(context: DecisionContext): number {
    let score = 1 - context.stakes;
    
    if (context.isNovel) score -= 0.3;
    if (context.urgencyMs < 1000) score += 0.1;
    else if (context.urgencyMs > 10000) score -= 0.1;

    const history = this.getHistoryAccuracy(context.situationType);
    if (history !== null) score = score * 0.7 + history * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private getHistoryAccuracy(situationType: string): number | null {
    const relevant = Array.from(this.outcomeHistory.entries())
      .filter(([key]) => key.startsWith(situationType));
    
    if (relevant.length < 3) return null;
    return relevant.filter(([, v]) => v.correct).length / relevant.length;
  }

  private createDecision(tier: RoutingTier, reason: string): RoutingDecision {
    return {
      tier,
      reason,
      confidenceRequired: tier === 'bot' ? this.config.botMinConfidence 
        : tier === 'brain' ? this.config.brainMinConfidence : 0.9,
      estimatedCostUsd: COST_ESTIMATES[tier],
      estimatedTimeMs: LATENCY_ESTIMATES[tier],
    };
  }

  private updateMetrics(tier: RoutingTier): void {
    if (tier === 'bot') this.metrics.botRequests++;
    else if (tier === 'brain') this.metrics.brainRequests++;
    else this.metrics.humanRequests++;

    this.metrics.totalCostUsd += COST_ESTIMATES[tier];
    this.metrics.savedCostUsd = 
      (this.metrics.totalRequests * COST_ESTIMATES.human) - this.metrics.totalCostUsd;
  }

  recordOutcome(contextId: string, correct: boolean, tier: RoutingTier): void {
    if (!this.config.learningEnabled) return;
    this.outcomeHistory.set(contextId, { correct, tier });
    
    if (this.outcomeHistory.size > 10000) {
      const keys = Array.from(this.outcomeHistory.keys()).slice(0, 1000);
      keys.forEach(k => this.outcomeHistory.delete(k));
    }
  }

  addRule(situationType: string, tier: RoutingTier): void {
    this.patternRules.set(situationType, tier);
  }

  getMetrics(): CostMetrics {
    return { ...this.metrics };
  }

  getCostReduction(): number {
    if (this.metrics.totalRequests === 0) return 0;
    const humanOnlyCost = this.metrics.totalRequests * COST_ESTIMATES.human;
    return ((humanOnlyCost - this.metrics.totalCostUsd) / humanOnlyCost) * 100;
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      botRequests: 0,
      brainRequests: 0,
      humanRequests: 0,
      totalCostUsd: 0,
      savedCostUsd: 0,
      averageLatencyMs: 0,
    };
    this.outcomeHistory.clear();
  }
}
