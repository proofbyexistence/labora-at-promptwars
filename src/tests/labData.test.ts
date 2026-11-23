import assert from 'node:assert/strict';
import {
  filterItems,
  paginateItems,
  parseHashState,
  serializeHashState,
} from '../js/filter';
import {
  applyAllocationSuggestion,
  bookSlot,
  cancelSlotBooking,
  createCustomBooking,
  getCurrentUser,
  getDepartments,
  getItemById,
  getItems,
  getLabs,
  getRequests,
  getSlots,
  resetLabStore,
  reviewAccessRequest,
  submitAccessRequest,
  switchUserRole,
} from '../js/labData';
import {
  allocate,
  ALLOCATION_WEIGHTS,
  buildWeekDates,
  buildWeeklyHourlySlots,
  canUserBookItem,
  detectConflicts,
  explainAllocation,
  scoreRequest,
  validateBooking,
} from '../js/scheduler';

function runTests() {
  resetLabStore();

  // 1. Structural dataset guarantees
  const departments = getDepartments();
  assert.equal(departments.length, 7, 'Expected 7 academic departments');

  const allLabs = getLabs();
  assert.equal(allLabs.length, 14, 'Expected 2 labs per department (14 total)');
  for (const dept of departments) {
    assert.equal(getLabs(dept.id).length, 2, `Expected 2 labs for ${dept.name}`);
  }

  const allItems = getItems();
  assert.ok(allItems.length >= 30, `Expected at least 30 items, got ${allItems.length}`);
  for (const lab of allLabs) {
    const labItems = getItems({ labId: lab.id });
    assert.ok(
      labItems.length >= 3 && labItems.length <= 5,
      `Expected 3-5 items in ${lab.name}, got ${labItems.length}`
    );
  }

  const requiredTypes = ['Instruments', 'Development kits', 'Workstations', 'Safety gear'];
  for (const type of requiredTypes) {
    const matching = getItems({ type: type as typeof allItems[number]['type'] });
    assert.ok(matching.length > 0, `Expected equipment of type ${type}`);
  }

  const initialRequests = getRequests();
  assert.ok(initialRequests.length >= 6, 'Expected at least 6 initial sample access requests');

  // 2. Pure filter module tests
  const byDeptSearch = filterItems(
    allItems,
    { query: '  biotechnology  ' },
    { departments, labs: allLabs }
  );
  assert.equal(byDeptSearch.length, 6, 'Search should match department name case-insensitively');

  const byLabSearch = filterItems(
    allItems,
    { query: 'SHN-204' },
    { departments, labs: allLabs }
  );
  assert.equal(byLabSearch.length, 3, 'Search should match lab room');

  const byCombined = filterItems(
    allItems,
    { departmentId: 'dept-ece', type: 'Development kits', status: 'Available' },
    { departments, labs: allLabs }
  );
  assert.ok(byCombined.length >= 2, 'Combined filters should return matching ECE dev kits');

  // 3. Pagination & hash parsing tests
  const page1 = paginateItems(allItems, 1, 9);
  assert.equal(page1.items.length, 9);
  assert.equal(page1.page, 1);
  assert.equal(page1.totalPages, Math.ceil(allItems.length / 9));

  const parsedAlias = parseHashState('#dept=electronics&type=dev-kits&q=  FPGA  &p=2', {
    departments,
    labs: allLabs,
    items: allItems,
  });
  assert.equal(parsedAlias.page, 'discover');
  assert.equal(parsedAlias.filters.departmentId, 'dept-ece');
  assert.equal(parsedAlias.filters.type, 'Development kits');
  assert.equal(parsedAlias.filters.query, 'FPGA');
  assert.equal(parsedAlias.catalogPage, 2);

  const parsedUnknownItem = parseHashState('#booking&item=unknown-999', {
    departments,
    labs: allLabs,
    items: allItems,
  });
  assert.equal(parsedUnknownItem.page, 'booking');
  assert.equal(parsedUnknownItem.itemId, 'unknown-999');

  const serialized = serializeHashState({
    page: 'discover',
    filters: { departmentId: 'dept-ece', type: 'Development kits' },
    catalogPage: 2,
  });
  assert.equal(serialized, '#discover&dept=dept-ece&type=Development+kits&p=2');

  // 4. Scheduler validation, conflict detection, scoring & allocation
  const weekDates = buildWeekDates('2026-11-23');
  assert.equal(weekDates.length, 6, 'Week grid should contain Mon–Sat (6 days)');
  assert.equal(weekDates[0], '2026-11-23');
  assert.equal(weekDates[5], '2026-11-28');

  const phySlots = getSlots('eq-phy-01');
  const hourlyPhy = buildWeeklyHourlySlots('eq-phy-01', phySlots, '2026-11-23');
  assert.equal(hourlyPhy.length, 48, '6 days x 8 hours = 48 one-hour slots');

  // Validation rejections
  const pastCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-20', start: '10:00', durationHours: 2, purpose: 'Test' },
    phySlots
  );
  assert.equal(pastCheck.ok, false);

  const sundayCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-29', start: '10:00', durationHours: 2, purpose: 'Test' },
    phySlots
  );
  assert.equal(sundayCheck.ok, false);

  const outsideHoursCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-24', start: '16:00', durationHours: 2, purpose: 'Test' },
    phySlots
  );
  assert.equal(outsideHoursCheck.ok, false);

  const overFourCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-24', start: '09:00', durationHours: 5, purpose: 'Test' },
    phySlots
  );
  assert.equal(overFourCheck.ok, false);

  // Overlap on 2026-11-24 13:00-15:00 (booked by R. Kapoor)
  const overlapCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-24', start: '13:00', durationHours: 2, purpose: 'Overlap' },
    phySlots
  );
  assert.equal(overlapCheck.ok, false);

  const validCheck = validateBooking(
    { itemId: 'eq-phy-01', date: '2026-11-25', start: '10:00', durationHours: 2, purpose: 'Transmission run' },
    phySlots
  );
  assert.equal(validCheck.ok, true);

  // Conflict detection & deterministic scoring / allocation
  assert.equal(
    ALLOCATION_WEIGHTS.deadlineUrgency +
      ALLOCATION_WEIGHTS.feasibility +
      ALLOCATION_WEIGHTS.studentRequirements +
      ALLOCATION_WEIGHTS.fairness,
    100
  );

  const conflicts = detectConflicts(initialRequests, phySlots);
  assert.ok(conflicts.length >= 1, 'Expected seeded conflict on eq-phy-01');
  const phyConflict = conflicts.find((c) => c.itemId === 'eq-phy-01');
  assert.ok(phyConflict && phyConflict.requests.length === 2);

  const phyItem = getItemById('eq-phy-01')!;
  const scored0 = scoreRequest(phyConflict.requests[0], { item: phyItem, slots: phySlots });
  assert.ok(scored0.score >= 0 && scored0.score <= 100);
  assert.equal(scored0.breakdown.length, 4);

  const allocation = allocate(phyConflict.requests, phyItem, phySlots, allItems);
  assert.equal(allocation.assignments.length, 2, 'Both competing requests should receive slots');
  assert.equal(allocation.assignments[0].student, 'Maya Lin');
  assert.equal(allocation.assignments[0].isContestedSlot, true);
  assert.equal(allocation.assignments[1].isContestedSlot, false);
  assert.ok(explainAllocation(allocation).length > 10);

  // 5. Access rules
  const student = getCurrentUser();
  assert.equal(student.role, 'student');
  const restrictedItem = getItemById('eq-ece-02')!;
  assert.equal(canUserBookItem(restrictedItem, student, initialRequests).allowed, false);
  const trainedItem = getItemById('eq-ece-06')!;
  assert.equal(canUserBookItem(trainedItem, student, initialRequests).allowed, true);
  assert.equal(canUserBookItem(phyItem, student, initialRequests).allowed, true);

  // 6. Custom booking & allocation persistence
  const customBooked = createCustomBooking({
    itemId: 'eq-phy-01',
    date: '2026-11-25',
    start: '10:00',
    durationHours: 2,
    purpose: 'Lab check',
  });
  assert.ok(customBooked && customBooked.booked);

  applyAllocationSuggestion(allocation);
  const updatedReq = getRequests().find((r) => r.id === 'req-107');
  assert.equal(updatedReq?.status, 'Approved');

  // 7. Existing booking/request mutations
  resetLabStore();
  const openSlot = getSlots('eq-phy-01').find((s) => !s.booked);
  assert.ok(openSlot);
  const booked = bookSlot(openSlot.id, 'eq-phy-01', 'Optics check');
  assert.equal(booked?.booked, true);
  const released = cancelSlotBooking(openSlot.id, 'eq-phy-01');
  assert.equal(released?.booked, false);

  const createdReq = submitAccessRequest({
    itemId: 'eq-ece-02',
    project: 'Test FPGA Filter',
    deadline: '2026-12-20',
    teamSize: 2,
    hoursNeeded: 4,
  });
  assert.ok(createdReq);
  const faculty = switchUserRole('faculty');
  assert.equal(faculty.role, 'faculty');
  const reviewed = reviewAccessRequest(createdReq.id, 'Approved', 'Cleared for bench 12');
  assert.equal(reviewed?.status, 'Approved');

  resetLabStore();
}

runTests();
