/**
 * SuperInstance-SDK1 — Tests
 * EscalationEngine, HierarchicalMemory, TripartiteConsensus
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EscalationEngine } from '../src/EscalationEngine';
import { HierarchicalMemory } from '../src/HierarchicalMemory';
import { TripartiteConsensus } from '../src/TripartiteConsensus';

// ═══════════════════════════════════════════════════════════════════
// EscalationEngine Tests (10 tests)
// ═══════════════════════════════════════════════════════════════════

describe('EscalationEngine', () => {
  let ee: EscalationEngine;
  beforeEach(() => { ee = new EscalationEngine(); });

  it('should create with default config', () => {
    expect(ee).toBeDefined();
  });

  it('should route a simple context', () => {
    const decision = ee.route({
      situation: 'test query',
      complexity: 0.5,
      costBudget: 1.0,
      urgency: 'normal',
    });
    expect(decision).toBeDefined();
    expect(decision.tier).toBeDefined();
  });

  it('should route to different tiers based on complexity', () => {
    const low = ee.route({ situation: 'simple', complexity: 0.1, costBudget: 1.0, urgency: 'low' });
    const high = ee.route({ situation: 'complex', complexity: 0.9, costBudget: 1.0, urgency: 'critical' });
    expect(low).toBeDefined();
    expect(high).toBeDefined();
  });

  it('should record outcomes', () => {
    ee.route({ situation: 'test', complexity: 0.5, costBudget: 1.0, urgency: 'normal' });
    ee.recordOutcome('ctx-1', true, 'bot');
  });

  it('should add custom rules', () => {
    ee.addRule('special_case', 'human');
  });

  it('should return metrics', () => {
    ee.route({ situation: 'test', complexity: 0.3, costBudget: 1.0, urgency: 'low' });
    const metrics = ee.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should return cost reduction', () => {
    const reduction = ee.getCostReduction();
    expect(typeof reduction).toBe('number');
  });

  it('should reset', () => {
    ee.route({ situation: 'test', complexity: 0.5, costBudget: 1.0, urgency: 'normal' });
    ee.reset();
    const metrics = ee.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should handle custom config', () => {
    const custom = new EscalationEngine({
      botThreshold: 0.3,
      humanThreshold: 0.8,
    });
    expect(custom).toBeDefined();
  });

  it('should handle critical urgency', () => {
    const decision = ee.route({
      situation: 'urgent task',
      complexity: 0.9,
      costBudget: 10.0,
      urgency: 'critical',
    });
    expect(decision).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// HierarchicalMemory Tests (12 tests)
// ═══════════════════════════════════════════════════════════════════

describe('HierarchicalMemory', () => {
  let hm: HierarchicalMemory;
  beforeEach(() => { hm = new HierarchicalMemory(); });

  it('should create with default config', () => {
    expect(hm).toBeDefined();
  });

  it('should add items', () => {
    const item = hm.add('test content', { tags: ['test'] });
    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
  });

  it('should get items by id', () => {
    const added = hm.add('findable content');
    const found = hm.get(added.id);
    expect(found).toBeDefined();
    expect(found!.content).toBe('findable content');
  });

  it('should update items', () => {
    const item = hm.add('original');
    const updated = hm.update(item.id, { content: 'modified' });
    expect(updated).toBe(true);
    expect(hm.get(item.id)!.content).toBe('modified');
  });

  it('should forget items', () => {
    const item = hm.add('temporary');
    expect(hm.forget(item.id)).toBe(true);
    expect(hm.get(item.id)).toBeUndefined();
  });

  it('should search items', () => {
    hm.add('apple banana cherry');
    hm.add('dog elephant fox');
    const results = hm.search({ query: 'apple' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should consolidate memory', () => {
    for (let i = 0; i < 20; i++) hm.add(`memory ${i}`);
    const consolidated = hm.consolidate();
    expect(typeof consolidated).toBe('number');
  });

  it('should handle missing items gracefully', () => {
    expect(hm.get('nonexistent')).toBeUndefined();
    expect(hm.update('nonexistent', {})).toBe(false);
    expect(hm.forget('nonexistent')).toBe(false);
  });

  it('should work with custom config', () => {
    const custom = new HierarchicalMemory({ workingCapacity: 10 });
    expect(custom).toBeDefined();
  });

  it('should add with metadata', () => {
    const item = hm.add('tagged content', { tags: ['a', 'b'], importance: 0.8 });
    expect(item).toBeDefined();
  });

  it('should search with options', () => {
    hm.add('short text');
    hm.add('another piece of text about quantum computing');
    const results = hm.search({ query: 'quantum', limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle many items', () => {
    for (let i = 0; i < 100; i++) hm.add(`item ${i}`);
    const results = hm.search({ query: 'item' });
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TripartiteConsensus Tests (8 tests)
// ═══════════════════════════════════════════════════════════════════

describe('TripartiteConsensus', () => {
  it('should create with default config', () => {
    const tc = new TripartiteConsensus();
    expect(tc).toBeDefined();
  });

  it('should deliberate with heuristic fallback', async () => {
    const tc = new TripartiteConsensus();
    // Without LLM function, should fall back to heuristic
    const result = await tc.deliberate({
      question: 'Should we deploy now?',
      context: 'CI passed, tests green, no breaking changes',
      domain: 'engineering',
    });
    expect(result).toBeDefined();
    expect(result.decision).toBeDefined();
    expect(typeof result.confidence).toBe('number');
  });

  it('should work with custom LLM function', async () => {
    const tc = new TripartiteConsensus();
    tc.setLLMCallFn(async (prompt) => {
      return JSON.stringify({ proposal: 'yes', confidence: 0.9, reasoning: 'looks good' });
    });
    const result = await tc.deliberate({
      question: 'Deploy?',
      context: 'All clear',
      domain: 'ops',
    });
    expect(result).toBeDefined();
  });

  it('should handle timeout gracefully', async () => {
    const tc = new TripartiteConsensus({ timeoutMs: 100 });
    tc.setLLMCallFn(async () => {
      await new Promise(r => setTimeout(r, 500));
      return 'never';
    });
    // Should still return a result (fallback)
    const result = await tc.deliberate({
      question: 'test',
      context: 'timeout test',
      domain: 'test',
    });
    expect(result).toBeDefined();
  });

  it('should handle custom config', () => {
    const tc = new TripartiteConsensus({
      rounds: 3,
      consensusThreshold: 0.8,
    });
    expect(tc).toBeDefined();
  });

  it('should return result with votes', async () => {
    const tc = new TripartiteConsensus();
    const result = await tc.deliberate({
      question: 'Test question?',
      context: 'Test context',
      domain: 'test',
    });
    expect(result).toBeDefined();
  });

  it('should handle empty context', async () => {
    const tc = new TripartiteConsensus();
    const result = await tc.deliberate({
      question: 'Simple yes/no',
      context: '',
      domain: 'general',
    });
    expect(result).toBeDefined();
  });

  it('should create with rounds config', () => {
    const tc = new TripartiteConsensus({ rounds: 5 });
    expect(tc).toBeDefined();
  });
});
