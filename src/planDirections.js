import { ALL_ATTRACTIONS_BY_ID, RESTAURANTS } from "./extendedData.js";
import { approximateWalkingMinutes, distanceMeters, formatDistance } from "./appUtils.js";
import { zoneLabel } from "./planner.js";

const RESTAURANTS_BY_ID = Object.freeze(Object.fromEntries(RESTAURANTS.map((restaurant) => [restaurant.id, restaurant])));

function directionLeg(from, destination) {
  if (!destination) return null;
  if (!from) {
    return {
      fromLabel: "wejścia lub bieżącej pozycji",
      destination,
      meters: null,
      minutes: null,
      copy: `Pierwszy punkt · kierujcie się do ${zoneLabel(destination.zone)}`,
    };
  }
  const meters = Math.round(distanceMeters(from, destination));
  const minutes = approximateWalkingMinutes(meters);
  const zoneDirection = from.zone === destination.zone
    ? `zostańcie w strefie ${zoneLabel(destination.zone)}`
    : `kierujcie się do ${zoneLabel(destination.zone)}`;
  return {
    fromLabel: from.name,
    destination,
    meters,
    minutes,
    copy: `Z ${from.name}: ${zoneDirection} · ${formatDistance(meters)} · około ${minutes} min`,
  };
}

export function directionsForDay(day) {
  const directions = {};
  let previous = null;
  for (const step of day?.steps || []) {
    if (step.kind === "ride") {
      const ride = ALL_ATTRACTIONS_BY_ID[step.attractionId];
      directions[step.id] = directionLeg(previous, ride);
      if (ride) previous = ride;
      continue;
    }
    if (step.kind === "split") {
      const rides = (step.assignments || []).map((assignment) => ALL_ATTRACTIONS_BY_ID[assignment.attractionId]).filter(Boolean);
      rides.forEach((ride, index) => { directions[`${step.id}:${index}`] = directionLeg(previous, ride); });
      if (rides[0]) previous = rides[0];
      continue;
    }
    if (step.kind === "meal") {
      const restaurant = RESTAURANTS_BY_ID[step.restaurantId];
      directions[step.id] = directionLeg(previous, restaurant);
      if (restaurant) previous = restaurant;
    }
  }
  return directions;
}
