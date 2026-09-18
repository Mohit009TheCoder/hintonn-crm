/**
 * Team Analytics Engine
 * Per-rep per-source performance analytics and assignment optimization.
 */

import { getDb, getCollection } from './db.js';

/**
 * Get per-rep per-source conversion matrix.
 */
export function getRepSourceMatrix(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const reps = new Set();
  const sources = new Set();
  const matrix = {};

  for (const lead of contacts) {
    const rep = lead.rep || 'Unassigned';
    const source = lead.source || 'Unknown';
    reps.add(rep);
    sources.add(source);

    if (!matrix[rep]) matrix[rep] = {};
    if (!matrix[rep][source]) matrix[rep][source] = { leads: 0, won: 0, revenue: 0 };

    matrix[rep][source].leads += 1;
    if (lead.stage === 'won') {
      matrix[rep][source].won += 1;
      matrix[rep][source].revenue += lead.value || 0;
    }
  }

  // Add conversion rates
  for (const rep of Object.keys(matrix)) {
    for (const source of Object.keys(matrix[rep])) {
      const cell = matrix[rep][source];
      cell.conversion = cell.leads > 0 ? Math.round((cell.won / cell.leads) * 100) : 0;
    }
  }

  return {
    reps: [...reps].sort(),
    sources: [...sources].sort(),
    matrix
  };
}

/**
 * Get individual rep performance.
 */
export function getRepPerformance(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const team = db.team || [];
  const repMap = {};

  for (const lead of contacts) {
    const rep = lead.rep || 'Unassigned';
    if (!repMap[rep]) {
      repMap[rep] = {
        name: rep,
        totalLeads: 0,
        wonDeals: 0,
        lostDeals: 0,
        activeLeads: 0,
        revenue: 0,
        sources: {},
        pipeline: { new: 0, contacted: 0, qualified: 0, negotiation: 0 }
      };
    }

    const stats = repMap[rep];
    stats.totalLeads += 1;

    if (lead.stage === 'won') {
      stats.wonDeals += 1;
      stats.revenue += lead.value || 0;
    } else if (lead.stage === 'lost') {
      stats.lostDeals += 1;
    } else {
      stats.activeLeads += 1;
      if (stats.pipeline[lead.stage] !== undefined) {
        stats.pipeline[lead.stage] += 1;
      }
    }

    const source = lead.source || 'Unknown';
    if (!stats.sources[source]) stats.sources[source] = 0;
    stats.sources[source] += 1;
  }

  return Object.values(repMap).map(stats => {
    const closedDeals = stats.wonDeals + stats.lostDeals;
    stats.conversionRate = closedDeals > 0 ? Math.round((stats.wonDeals / closedDeals) * 100) : 0;
    stats.winRate = stats.totalLeads > 0 ? Math.round((stats.wonDeals / stats.totalLeads) * 100) : 0;

    // Top source
    const sourceEntries = Object.entries(stats.sources);
    stats.topSource = sourceEntries.length > 0
      ? sourceEntries.sort((a, b) => b[1] - a[1])[0][0]
      : 'None';
    delete stats.sources;

    // Team member info
    const member = team.find(m => m.name === stats.name);
    if (member) {
      stats.role = member.role;
      stats.email = member.email;
    }

    return stats;
  }).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get source effectiveness ranking.
 */
export function getSourceEffectiveness(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const sourceMap = {};

  for (const lead of contacts) {
    const source = lead.source || 'Unknown';
    if (!sourceMap[source]) {
      sourceMap[source] = {
        source,
        totalLeads: 0,
        wonDeals: 0,
        totalRevenue: 0,
        scores: [],
        responseTimes: []
      };
    }
    const stats = sourceMap[source];
    stats.totalLeads += 1;
    if (lead.score) stats.scores.push(lead.score);
    if (lead.stage === 'won') {
      stats.wonDeals += 1;
      stats.totalRevenue += lead.value || 0;
    }
  }

  return Object.values(sourceMap).map(stats => {
    stats.conversionRate = stats.totalLeads > 0
      ? Math.round((stats.wonDeals / stats.totalLeads) * 100)
      : 0;
    stats.avgDealValue = stats.wonDeals > 0
      ? Math.round(stats.totalRevenue / stats.wonDeals)
      : 0;
    stats.avgScore = stats.scores.length > 0
      ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
      : 0;
    stats.effectiveness = Math.round(
      (stats.conversionRate * 0.4) + (stats.avgScore * 0.3) + (Math.min(stats.totalLeads, 20) * 1.5)
    );
    delete stats.scores;
    return stats;
  }).sort((a, b) => b.effectiveness - a.effectiveness);
}

/**
 * Get lead assignment optimization suggestions.
 */
export function getAssignmentSuggestions(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const suggestions = [];

  // Build per-rep per-source conversion rates
  const repSourceMap = {};
  for (const lead of contacts) {
    if (lead.stage !== 'won' && lead.stage !== 'lost') continue;
    const rep = lead.rep || 'Unassigned';
    const source = lead.source || 'Unknown';
    const key = `${rep}__${source}`;
    if (!repSourceMap[key]) repSourceMap[key] = { won: 0, total: 0 };
    repSourceMap[key].total += 1;
    if (lead.stage === 'won') repSourceMap[key].won += 1;
  }

  // Find active leads that could be reassigned
  const activeLeads = contacts.filter(c => !['won', 'lost'].includes(c.stage) && c.rep);

  for (const lead of activeLeads) {
    const source = lead.source || 'Unknown';
    let bestRep = null;
    let bestRate = 0;

    // Find the rep with best conversion for this source
    for (const [key, stats] of Object.entries(repSourceMap)) {
      if (!key.endsWith(`__${source}`)) continue;
      const rep = key.split('__')[0];
      const rate = stats.total >= 2 ? (stats.won / stats.total) : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestRep = rep;
      }
    }

    if (bestRep && bestRep !== lead.rep && bestRate > 0.3) {
      const currentKey = `${lead.rep}__${source}`;
      const currentStats = repSourceMap[currentKey];
      const currentRate = currentStats && currentStats.total >= 2
        ? (currentStats.won / currentStats.total)
        : 0;

      if (bestRate > currentRate + 0.1) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.name,
          source,
          currentRep: lead.rep,
          suggestedRep: bestRep,
          reason: `${bestRep} has ${Math.round(bestRate * 100)}% conversion on ${source} leads vs ${Math.round(currentRate * 100)}% for ${lead.rep}`,
          expectedImprovement: `+${Math.round((bestRate - currentRate) * 100)}% conversion`
        });
      }
    }
  }

  return suggestions.slice(0, 20);
}
