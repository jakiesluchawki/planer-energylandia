import test from "node:test";
import assert from "node:assert/strict";
import { buildUniversalPlan, validatePlanSafety } from "../src/planner.js";
import { replacementOptionsForPlan, replacePlannedAttraction } from "../src/replacements.js";

const profile = {
  dayCount: 1,
  visitStartDate: "2026-07-14",
  arrivalTime: "10:00",
  departureTime: "20:00",
  pace: "normal",
  splitPolicy: "never",
  members: [
    { id: "a1", role: "adult", name: "A1", age: 35, height: 175 },
    { id: "a2", role: "adult", name: "A2", age: 35, height: 175 },
    { id: "c1", role: "child", name: "C1", age: 6, height: 120 },
    { id: "c2", role: "child", name: "C2", age: 6, height: 120 },
  ],
  preferences: { intensity: "mixed", interests: ["coasters", "family"], wet: "ok", maxQueue: 45 },
  meal: { mode: "fast", time: "13:15" },
};

test("podmiana zmienia tylko wybrany slot i zachowuje bezpieczeństwo, obiad oraz metę", () => {
  const plan = buildUniversalPlan(profile);
  const ride = plan.days[0].steps.find((step) => step.kind === "ride");
  const request = { dayIndex: 0, stepId: ride.id };
  const options = replacementOptionsForPlan(plan, request);
  assert.ok(options.length > 0 && options.length <= 3);

  const replacementId = options[0].attraction.id;
  const next = replacePlannedAttraction(plan, request, replacementId);
  const replaced = next.days[0].steps.find((step) => step.id === ride.id);
  const originalMeal = plan.days[0].steps.find((step) => step.kind === "meal");
  const nextMeal = next.days[0].steps.find((step) => step.kind === "meal");
  const originalFlex = plan.days[0].steps.at(-1);
  const nextFlex = next.days[0].steps.at(-1);

  assert.equal(replaced.attractionId, replacementId);
  assert.equal(replaced.startMin, ride.startMin);
  assert.equal(replaced.endMin, ride.endMin);
  assert.deepEqual(nextMeal, originalMeal);
  assert.deepEqual(nextFlex, originalFlex);
  assert.equal(next.days[0].stats.end, plan.days[0].stats.end);
  assert.equal(validatePlanSafety(next).valid, true);
});

test("odrzucone i już użyte atrakcje nie wracają w propozycjach", () => {
  const plan = buildUniversalPlan(profile);
  const ride = plan.days[0].steps.find((step) => step.kind === "ride");
  const request = { dayIndex: 0, stepId: ride.id };
  const first = replacementOptionsForPlan(plan, request);
  assert.ok(first.length > 0);
  const rejected = first[0].attraction.id;
  const next = replacementOptionsForPlan(plan, request, { rejectedIds: [rejected] });
  assert.equal(next.some((option) => option.attraction.id === rejected), false);
  const used = new Set(plan.days.flatMap((day) => day.steps.flatMap((step) => step.kind === "ride" ? [step.attractionId] : step.kind === "split" ? step.assignments.map((assignment) => assignment.attractionId) : [])));
  assert.equal(next.some((option) => used.has(option.attraction.id)), false);
});
