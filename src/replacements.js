import { ALL_ATTRACTIONS, ALL_ATTRACTIONS_BY_ID } from "./extendedData.js";
import { distanceMeters, walkingMinutes } from "./parkLogic.js";
import { evaluatePartyEligibility, validatePlanSafety, zoneLabel } from "./planner.js";

function membersByIds(plan, ids = []) {
  const wanted = new Set(ids);
  return (plan?.profile?.members || []).filter((member) => wanted.has(member.id));
}

function allUsedAttractionIds(plan) {
  return new Set((plan?.days || []).flatMap((day) => (day.steps || []).flatMap((step) => {
    if (step.kind === "ride") return [step.attractionId];
    if (step.kind === "split") return (step.assignments || []).map((assignment) => assignment.attractionId);
    return [];
  })));
}

function hardPreferenceMatch(attraction, profile, queue) {
  const preferences = profile?.preferences || {};
  if (preferences.wet === "avoid" && attraction.wet) return false;
  if (preferences.intensity === "calm" && (attraction.thrillLevel ?? 2) > 2) return false;
  if (queue?.isOpen === false) return false;
  if (Number.isFinite(queue?.waitTime) && queue.waitTime > (preferences.maxQueue ?? 45)) return false;
  return true;
}

function targetFor(plan, { dayIndex = 0, stepId, assignmentIndex = null } = {}) {
  const day = plan?.days?.[dayIndex];
  const step = day?.steps?.find((candidate) => candidate.id === stepId);
  if (!day || !step || (step.kind !== "ride" && step.kind !== "split")) return null;
  if (step.kind === "ride") {
    const attraction = ALL_ATTRACTIONS_BY_ID[step.attractionId];
    return attraction ? { day, step, attraction, memberIds: step.memberIds || [], assignmentIndex: null } : null;
  }
  const index = Number(assignmentIndex);
  const assignment = Number.isInteger(index) ? step.assignments?.[index] : null;
  const attraction = assignment ? ALL_ATTRACTIONS_BY_ID[assignment.attractionId] : null;
  return attraction ? { day, step, assignment, attraction, memberIds: assignment.memberIds || [], assignmentIndex: index } : null;
}

function sharedTagScore(current, candidate) {
  const currentTags = new Set(current.tags || []);
  return (candidate.tags || []).reduce((score, tag) => score + (currentTags.has(tag) ? 1 : 0), 0);
}

export function replacementOptionsForPlan(plan, request, { queueById = {}, rejectedIds = [] } = {}) {
  const target = targetFor(plan, request);
  if (!target) return [];
  const used = allUsedAttractionIds(plan);
  used.delete(target.attraction.id);
  const rejected = new Set(rejectedIds);
  const members = membersByIds(plan, target.memberIds);
  const useLiveQueue = Number(request?.dayIndex ?? 0) === 0;

  return ALL_ATTRACTIONS
    .filter((candidate) => candidate.id !== target.attraction.id)
    .filter((candidate) => !used.has(candidate.id) && !rejected.has(candidate.id))
    .filter((candidate) => candidate.defaultStatus !== "closed" && !candidate.toddlerLike)
    .map((candidate) => {
      const queue = useLiveQueue ? queueById[candidate.id] ?? null : null;
      const distance = distanceMeters(target.attraction, candidate);
      const walk = walkingMinutes(distance);
      const sameZone = candidate.zone === target.attraction.zone;
      const eligibility = evaluatePartyEligibility(candidate, members);
      const score = (sameZone ? 70 : 0)
        + sharedTagScore(target.attraction, candidate) * 18
        + Math.min(30, candidate.priority ?? 50) / 3
        - Math.abs((candidate.thrillLevel ?? 2) - (target.attraction.thrillLevel ?? 2)) * 14
        - distance / 22
        - (Number.isFinite(queue?.waitTime) ? queue.waitTime * 0.65 : 0);
      return { attraction: candidate, queue, distance, walkingMinutes: walk, sameZone, eligibility, score };
    })
    .filter((entry) => entry.distance <= 700)
    .filter((entry) => entry.eligibility.allEligible)
    .filter((entry) => hardPreferenceMatch(entry.attraction, plan.profile, entry.queue))
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, 3)
    .map((entry) => ({
      ...entry,
      reason: entry.sameZone
        ? `Ta sama strefa · około ${entry.walkingMinutes} min od wymienianego punktu`
        : `${zoneLabel(entry.attraction.zone)} · około ${entry.walkingMinutes} min od wymienianego punktu`,
    }));
}

function currentFirstAttractionId(days) {
  for (const day of days || []) {
    for (const step of day.steps || []) {
      if (step.kind === "ride") return step.attractionId;
      if (step.kind === "split") return step.assignments?.[0]?.attractionId ?? null;
    }
  }
  return null;
}

export function replacePlannedAttraction(plan, request, replacementId, { queueById = {} } = {}) {
  const target = targetFor(plan, request);
  const replacement = ALL_ATTRACTIONS_BY_ID[replacementId];
  if (!target || !replacement) throw new TypeError("Nie można znaleźć punktu planu lub atrakcji zastępczej.");

  const allowed = replacementOptionsForPlan(plan, request, { queueById }).some((option) => option.attraction.id === replacementId);
  if (!allowed) throw new TypeError("Ta atrakcja nie jest bezpiecznym zamiennikiem tego punktu.");

  const next = structuredClone(plan);
  const nextStep = next.days[request.dayIndex].steps.find((step) => step.id === request.stepId);
  const queue = Number(request.dayIndex) === 0 ? queueById[replacementId] ?? null : null;
  if (nextStep.kind === "ride") {
    nextStep.attractionId = replacementId;
    nextStep.zone = replacement.zone;
    nextStep.queueMinutes = Number.isFinite(queue?.waitTime) ? queue.waitTime : null;
  } else {
    const index = Number(request.assignmentIndex);
    const assignment = nextStep.assignments[index];
    assignment.attractionId = replacementId;
    assignment.queueMinutes = Number.isFinite(queue?.waitTime) ? queue.waitTime : null;
    if (index === 0) {
      nextStep.attractionId = replacementId;
      nextStep.zone = replacement.zone;
      nextStep.reunion = {
        ...nextStep.reunion,
        label: `Spotkanie przy ${replacement.name}`,
        location: replacement.location,
      };
    }
  }
  next.firstAttractionId = currentFirstAttractionId(next.days);
  next.safety = validatePlanSafety(next);
  if (!next.safety.valid) throw new TypeError(next.safety.issues[0] || "Zamiana narusza bezpieczeństwo planu.");
  return next;
}

export function replacementTargetForPlan(plan, request) {
  const target = targetFor(plan, request);
  return target ? { attraction: target.attraction, memberIds: target.memberIds } : null;
}
