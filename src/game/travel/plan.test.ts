import { describe, expect, it } from 'vitest';
import {
  arrivedAt,
  autoWalkStep,
  planFastTravel,
  planWalk,
  shouldFadeTravel,
  travelTargetX,
} from './plan';

describe('travel/plan: planWalk', () => {
  it('walks right when the target is ahead', () => {
    expect(planWalk(100, 260)).toEqual({ targetX: 260, direction: 1 });
  });

  it('walks left when the target is behind', () => {
    expect(planWalk(260, 100)).toEqual({ targetX: 100, direction: -1 });
  });

  it('has no direction when already there', () => {
    expect(planWalk(160, 160)).toEqual({ targetX: 160, direction: 0 });
  });
});

describe('travel/plan: arrivedAt', () => {
  it('is false while outside epsilon and true once within it', () => {
    const plan = planWalk(0, 200);
    expect(arrivedAt(197, plan)).toBe(false);
    expect(arrivedAt(198, plan)).toBe(true);
    expect(arrivedAt(200, plan)).toBe(true);
    expect(arrivedAt(202, plan)).toBe(true);
  });
});

describe('travel/plan: autoWalkStep (the walk-to-x target)', () => {
  it('steps toward the target until arrival, then stops', () => {
    const plan = planWalk(0, 200);
    expect(autoWalkStep(0, plan)).toEqual({ moveX: 1 });
    expect(autoWalkStep(150, plan)).toEqual({ moveX: 1 });
    expect(autoWalkStep(199, plan)).toBeNull();
    expect(autoWalkStep(200, plan)).toBeNull();
  });

  it('steps left for a target behind the current position', () => {
    const plan = planWalk(300, 100);
    expect(autoWalkStep(300, plan)).toEqual({ moveX: -1 });
  });

  it('never steps when the plan starts with no direction', () => {
    const plan = planWalk(160, 160);
    expect(autoWalkStep(160, plan)).toBeNull();
  });
});

describe('travel/plan: planFastTravel (BACKLOG.md Phase 7 — the menu)', () => {
  it('is a walk plan tagged to run', () => {
    expect(planFastTravel(100, 260)).toEqual({ targetX: 260, direction: 1, run: true });
  });

  it("autoWalkStep's intent includes run for a fast-travel plan", () => {
    const plan = planFastTravel(0, 200);
    expect(autoWalkStep(0, plan)).toEqual({ moveX: 1, run: true });
  });

  it("autoWalkStep's intent omits run for a plain click-to-open plan", () => {
    const plan = planWalk(0, 200);
    expect(autoWalkStep(0, plan)).toEqual({ moveX: 1 });
    expect(autoWalkStep(0, plan)).not.toHaveProperty('run');
  });
});

describe('travel/plan: travelTargetX', () => {
  it("resolves a project id to its station's x", () => {
    expect(travelTargetX('fiora')).toBe(640);
  });

  it("resolves classified to the vault station's x, not its (wider) zone centre", () => {
    expect(travelTargetX('classified')).toBe(2500);
  });

  it('resolves a dossier id to its stand x', () => {
    expect(travelTargetX('ecommerce-retail')).toBe(2650);
  });

  it('resolves lab (no station yet) to the centre of its zone', () => {
    expect(travelTargetX('lab')).toBe(3600);
  });

  it('is null for an id that is neither a station nor a zone', () => {
    expect(travelTargetX('nope')).toBeNull();
  });
});

describe('travel/plan: shouldFadeTravel', () => {
  it('runs (no fade) within 1.5 screens', () => {
    expect(shouldFadeTravel(0, 149, 100, false)).toBe(false);
  });

  it('fades beyond 1.5 screens', () => {
    expect(shouldFadeTravel(0, 151, 100, false)).toBe(true);
  });

  it('always fades under reduced motion, regardless of distance', () => {
    expect(shouldFadeTravel(0, 10, 1000, true)).toBe(true);
  });

  it('is symmetric for a target behind the current position', () => {
    expect(shouldFadeTravel(300, 100, 100, false)).toBe(true);
  });
});
