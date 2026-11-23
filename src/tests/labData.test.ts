import assert from 'node:assert/strict';
import {
  filterItems,
  paginateItems,
  parseHashState,
  serializeHashState,
} from '../js/filter';
import {
  bookSlot,
  cancelSlotBooking,
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
  assert.equal(initialRequests.length, 6, 'Expected 6 initial sample access requests');

  // 2. Pure filter module tests (name, lab, department, type, specs, trimmed case-insensitive)
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

  // 3. Pagination helper tests (9 items per page)
  const page1 = paginateItems(allItems, 1, 9);
  assert.equal(page1.items.length, 9);
  assert.equal(page1.page, 1);
  assert.equal(page1.totalPages, Math.ceil(allItems.length / 9));
  const clamped = paginateItems(allItems, 999, 9);
  assert.equal(clamped.page, clamped.totalPages);

  // 4. Hash parsing & sanitization tests
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

  const parsedInvalid = parseHashState('#dept=bogus&type=laser-sword&status=nope&p=-4', {
    departments,
    labs: allLabs,
    items: allItems,
  });
  assert.equal(parsedInvalid.filters.departmentId, '');
  assert.equal(parsedInvalid.filters.type, '');
  assert.equal(parsedInvalid.filters.status, '');
  assert.equal(parsedInvalid.catalogPage, 1);

  const serialized = serializeHashState({
    page: 'discover',
    filters: { departmentId: 'dept-ece', type: 'Development kits' },
    catalogPage: 2,
  });
  assert.equal(serialized, '#discover&dept=dept-ece&type=Development+kits&p=2');

  // 5. Query & item lookup
  const firstItem = getItemById('eq-phy-01');
  assert.ok(firstItem, 'Expected eq-phy-01 to resolve');
  assert.equal(getItemById('non-existent-id'), undefined);

  // 6. Slots and booking mutation
  const slotsBefore = getSlots('eq-phy-01');
  assert.ok(slotsBefore.length > 0, 'Expected sample slots for eq-phy-01');
  const openSlot = slotsBefore.find((s) => !s.booked);
  assert.ok(openSlot, 'Expected an open slot on eq-phy-01');

  const booked = bookSlot(openSlot.id, 'eq-phy-01', 'Optics check');
  assert.equal(booked?.booked, true);
  const released = cancelSlotBooking(openSlot.id, 'eq-phy-01');
  assert.equal(released?.booked, false);

  // 7. Role switcher, access request submission & faculty approval
  assert.equal(getCurrentUser().role, 'student');
  const createdReq = submitAccessRequest({
    itemId: 'eq-ece-02',
    project: 'Test FPGA Filter',
    deadline: '2026-12-20',
    teamSize: 2,
    hoursNeeded: 4,
  });
  assert.ok(createdReq, 'Expected new access request to be created');
  assert.equal(getRequests().length, 7);

  const faculty = switchUserRole('faculty');
  assert.equal(faculty.role, 'faculty');

  const reviewed = reviewAccessRequest(createdReq.id, 'Approved', 'Cleared for bench 12');
  assert.equal(reviewed?.status, 'Approved');
  assert.equal(reviewed?.facultyNote, 'Cleared for bench 12');

  resetLabStore();
}

runTests();
