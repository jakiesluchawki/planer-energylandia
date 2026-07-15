import test from "node:test";
import assert from "node:assert/strict";
import { directionsForDay } from "../src/planDirections.js";

test("PDF dostaje czytelne wskazówki z dystansem i czasem marszu", () => {
  const day = {
    steps: [
      { id: "r1", kind: "ride", attractionId: "honey-harbour" },
      { id: "r2", kind: "ride", attractionId: "mokate-twist" },
      { id: "meal", kind: "meal", restaurantId: "napoli" },
    ],
  };
  const directions = directionsForDay(day);
  assert.match(directions.r1.copy, /Pierwszy punkt/);
  assert.equal(directions.r1.meters, null);
  assert.ok(directions.r2.meters > 0);
  assert.ok(directions.r2.minutes >= 1);
  assert.match(directions.r2.copy, /m · około \d+ min/);
  assert.match(directions.meal.copy, /kierujcie się|zostańcie/);
});

test("każda odnoga podziału ma własną instrukcję dojścia", () => {
  const day = {
    steps: [
      { id: "r1", kind: "ride", attractionId: "honey-harbour" },
      { id: "split", kind: "split", assignments: [{ attractionId: "mokate-twist" }, { attractionId: "bumble-boats" }] },
    ],
  };
  const directions = directionsForDay(day);
  assert.ok(directions["split:0"]?.meters > 0);
  assert.ok(directions["split:1"]?.meters > 0);
});
