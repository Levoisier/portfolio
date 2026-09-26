import { describe, expect, it } from 'vitest';
import { arrivedAt, autoWalkStep, planWalk } from './plan';

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
