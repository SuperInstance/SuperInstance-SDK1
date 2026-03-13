/**
 * HierarchicalMemory - 4-Tier Cognitive Memory Architecture
 * 
 * Biologically-inspired memory:
 * - Working Memory: Fast, capacity-limited, priority-based eviction
 * - Episodic Memory: Events with emotional tagging, temporal context
 * - Semantic Memory: General knowledge with vector embeddings
 * - Procedural Memory: Skills with mastery progression
 */

import type {
  MemoryTier,
  MemoryItem,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStats,
  HierarchicalMemoryConfig,
} from './types';

const DEFAULT_CONFIG: HierarchicalMemoryConfig = {
  workingMemoryCapacity: 20,
  workingMemoryHalfLife: 1800000,
  consolidationThreshold: 0.6,
  emotionalThreshold: 0.3,
  autoConsolidation: true,
  consolidationInterval: 60000,
};

export class HierarchicalMemory {
  private config: HierarchicalMemoryConfig;
  private workingMemory: Map<string, MemoryItem>;
  private episodicMemory: Map<string, MemoryItem>;
  private semanticMemory: Map<string, MemoryItem>;
  private proceduralMemory: Map<string, MemoryItem>;
  private consolidationCount: number;
  private consolidationTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<HierarchicalMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workingMemory = new Map();
    this.episodicMemory = new Map();
    this.semanticMemory = new Map();
    this.proceduralMemory = new Map();
    this.consolidationCount = 0;

    if (this.config.autoConsolidation) {
      this.startAutoConsolidation();
    }
  }

  // ============================================
  // Core Operations
  // ============================================

  add(content: string, metadata?: MemoryMetadata): MemoryItem {
    const item: MemoryItem = {
      id: this.generateId(),
      content,
      importance: metadata?.skillName ? 0.8 : 0.5,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tier: 'working',
      metadata,
    };

    if (this.workingMemory.size >= this.config.workingMemoryCapacity) {
      this.evictFromWorking();
    }

    this.workingMemory.set(item.id, item);
    return item;
  }

  get(id: string): MemoryItem | undefined {
    const item = this.findInAnyTier(id);
    if (item) {
      item.lastAccessedAt = Date.now();
      item.accessCount++;
      item.importance = Math.min(1, item.importance + 0.1);
    }
    return item;
  }

  update(id: string, updates: Partial<MemoryItem>): boolean {
    const item = this.get(id);
    if (!item) return false;
    Object.assign(item, updates);
    item.lastAccessedAt = Date.now();
    return true;
  }

  forget(id: string): boolean {
    return (
      this.workingMemory.delete(id) ||
      this.episodicMemory.delete(id) ||
      this.semanticMemory.delete(id) ||
      this.proceduralMemory.delete(id)
    );
  }

  // ============================================
  // Search
  // ============================================

  search(options: MemorySearchOptions): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const queryLower = options.query.toLowerCase();

    const tiersToSearch: MemoryTier[] = options.tierFilter ?? 
      ['working', 'episodic', 'semantic', 'procedural'];

    for (const tier of tiersToSearch) {
      const memory = this.getMemoryByTier(tier);
      
      for (const item of memory.values()) {
        const relevance = this.calculateRelevance(item, queryLower, options.mode);
        
        if (relevance > 0) {
          results.push({
            item,
            relevanceScore: relevance,
            matchReason: 'Content similarity match',
          });
        }
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, options.topK);
  }

  private calculateRelevance(
    item: MemoryItem, 
    query: string, 
    mode: string
  ): number {
    const contentLower = item.content.toLowerCase();
    
    let baseScore = 0;
    if (contentLower.includes(query)) {
      baseScore = 0.8;
    } else if (item.metadata?.tags?.some(t => t.toLowerCase().includes(query))) {
      baseScore = 0.6;
    }

    const importance = item.importance;
    const recency = Math.max(0, 1 - (Date.now() - item.lastAccessedAt) / 86400000);
    const accessBoost = Math.min(item.accessCount * 0.05, 0.3);

    switch (mode) {
      case 'temporal':
        return recency * importance;
      case 'contextual':
        return (0.5 + accessBoost) * importance;
      case 'hybrid':
      default:
        return (baseScore * 0.4 + recency * 0.3 + importance * 0.2 + accessBoost * 0.1);
    }
  }

  // ============================================
  // Consolidation
  // ============================================

  consolidate(): number {
    let consolidated = 0;

    for (const [id, item] of this.workingMemory) {
      if (this.shouldConsolidate(item)) {
        const targetTier = this.determineTargetTier(item);
        this.moveToTier(item, targetTier);
        this.workingMemory.delete(id);
        consolidated++;
      }
    }

    this.consolidationCount += consolidated;
    return consolidated;
  }

  private shouldConsolidate(item: MemoryItem): boolean {
    if (item.importance >= this.config.consolidationThreshold) return true;
    if (item.accessCount >= 3) return true;
    
    const emotionalValence = Math.abs(item.metadata?.emotionalValence ?? 0);
    if (emotionalValence >= this.config.emotionalThreshold) return true;
    
    if (item.metadata?.skillName) return true;
    return false;
  }

  private determineTargetTier(item: MemoryItem): MemoryTier {
    if (item.metadata?.skillName) return 'procedural';
    
    const emotionalValence = Math.abs(item.metadata?.emotionalValence ?? 0);
    if (emotionalValence >= this.config.emotionalThreshold) return 'episodic';
    
    return 'semantic';
  }

  private moveToTier(item: MemoryItem, tier: MemoryTier): void {
    item.tier = tier;
    this.getMemoryByTier(tier).set(item.id, item);
  }

  // ============================================
  // Working Memory Management
  // ============================================

  private evictFromWorking(): void {
    let lowestPriority = Infinity;
    let lowestId: string | undefined;

    for (const [id, item] of this.workingMemory) {
      const priority = this.calculatePriority(item);
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestId = id;
      }
    }

    if (lowestId) {
      const item = this.workingMemory.get(lowestId);
      if (item && this.shouldConsolidate(item)) {
        this.moveToTier(item, this.determineTargetTier(item));
        this.consolidationCount++;
      }
      this.workingMemory.delete(lowestId);
    }
  }

  private calculatePriority(item: MemoryItem): number {
    const age = Date.now() - item.lastAccessedAt;
    const decayFactor = Math.pow(0.5, age / this.config.workingMemoryHalfLife);
    return item.importance * decayFactor * (1 + item.accessCount * 0.1);
  }

  // ============================================
  // Skills
  // ============================================

  addSkill(name: string, instructions: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): MemoryItem {
    const item = this.add(instructions, {
      skillName: name,
      masteryLevel: 0,
      tags: ['skill', name, difficulty],
    });
    
    this.workingMemory.delete(item.id);
    item.tier = 'procedural';
    item.importance = 0.9;
    this.proceduralMemory.set(item.id, item);
    
    return item;
  }

  practice(skillId: string, success: boolean): number {
    const skill = this.proceduralMemory.get(skillId);
    if (!skill || !skill.metadata?.skillName) return 0;

    const current = skill.metadata.masteryLevel ?? 0;
    const improvement = success ? 0.1 : 0.02;
    skill.metadata.masteryLevel = Math.min(1, current + improvement);
    
    return skill.metadata.masteryLevel;
  }

  // ============================================
  // Import/Export
  // ============================================

  exportPack(tiers?: MemoryTier[]): { items: MemoryItem[]; exportedAt: number; stats: MemoryStats } {
    const tiersToExport = tiers ?? ['semantic', 'procedural'];
    const items: MemoryItem[] = [];

    for (const tier of tiersToExport) {
      items.push(...Array.from(this.getMemoryByTier(tier).values()));
    }

    return {
      items,
      exportedAt: Date.now(),
      stats: this.getStats(),
    };
  }

  importPack(pack: { items: MemoryItem[] }, trustLevel: number = 0.5): number {
    let imported = 0;

    for (const item of pack.items) {
      if (item.importance * trustLevel >= this.config.consolidationThreshold) {
        const memory = this.getMemoryByTier(item.tier);
        if (!memory.has(item.id)) {
          item.id = this.generateId();
          memory.set(item.id, item);
          imported++;
        }
      }
    }

    return imported;
  }

  // ============================================
  // Utilities
  // ============================================

  private findInAnyTier(id: string): MemoryItem | undefined {
    return this.workingMemory.get(id) ||
      this.episodicMemory.get(id) ||
      this.semanticMemory.get(id) ||
      this.proceduralMemory.get(id);
  }

  private getMemoryByTier(tier: MemoryTier): Map<string, MemoryItem> {
    switch (tier) {
      case 'working': return this.workingMemory;
      case 'episodic': return this.episodicMemory;
      case 'semantic': return this.semanticMemory;
      case 'procedural': return this.proceduralMemory;
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAutoConsolidation(): void {
    this.consolidationTimer = setInterval(() => this.consolidate(), this.config.consolidationInterval);
  }

  getStats(): MemoryStats {
    return {
      workingMemoryCount: this.workingMemory.size,
      workingMemoryCapacity: this.config.workingMemoryCapacity,
      episodicMemoryCount: this.episodicMemory.size,
      semanticMemoryCount: this.semanticMemory.size,
      proceduralMemoryCount: this.proceduralMemory.size,
      totalConsolidations: this.consolidationCount,
      averageImportance: this.calculateAverageImportance(),
    };
  }

  private calculateAverageImportance(): number {
    const all = [
      ...this.semanticMemory.values(),
      ...this.proceduralMemory.values(),
    ];
    return all.length > 0
      ? all.reduce((sum, i) => sum + i.importance, 0) / all.length
      : 0;
  }

  clear(): void {
    this.workingMemory.clear();
    this.episodicMemory.clear();
    this.semanticMemory.clear();
    this.proceduralMemory.clear();
    this.consolidationCount = 0;
  }

  destroy(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }
  }
}
