// SMOKE TEST: checks the main rules of the running API and prints PASS or FAIL for each.
//
//   1. Start the API in one terminal:        npm.cmd run dev
//   2. In another terminal (server folder):  npm.cmd run smoke
//
// It uses the demo accounts from `npm run db:seed` and talks to the API over HTTP, exactly
// like the website does. It never touches the database directly. Rooms it creates are
// removed again at the end (soft removal, so a few hidden rows remain in the database).
//
// Why it exists: after every change (a new feature, a database migration) we can prove in
// about 30 seconds that the important rules still hold. CLAUDE.md section 13: do not assume
// a feature works because it was written.

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';

interface Reply {
  status: number;
  body: unknown;
}
type Row = Record<string, unknown>;

async function api(method: string, path: string, token?: string, body?: unknown): Promise<Reply> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON: keep the text */
  }
  return { status: res.status, body: parsed };
}

// Small readers so the checks below stay short.
const asObject = (r: Reply): Row => (r.body && typeof r.body === 'object' && !Array.isArray(r.body) ? (r.body as Row) : {});
const asList = (r: Reply): Row[] => (Array.isArray(r.body) ? (r.body as Row[]) : []);
const message = (r: Reply): string => String(asObject(r).message ?? '');
const labels = (r: Reply): string[] => asList(r).map((x) => String(x.label));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `   -> got ${JSON.stringify(detail)}`}`);
}
const section = (title: string) => console.log(`\n--- ${title}`);

// Log in with the real one-time-code flow. In development the API returns the code as "devCode".
async function login(phone: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const otp = await api('POST', '/auth/request-otp', undefined, { phone });
    if (otp.status === 429) {
      console.log(`  (waiting 31 seconds: a code was requested for ${phone} less than 30 seconds ago)`);
      await sleep(31_000);
      continue;
    }
    const code = asObject(otp).devCode;
    if (typeof code !== 'string') {
      throw new Error(`No dev code for ${phone} (status ${otp.status}: ${message(otp)}). Is the API running in development?`);
    }
    const verified = await api('POST', '/auth/verify-otp', undefined, { phone, code });
    const token = asObject(verified).token;
    if (typeof token !== 'string') throw new Error(`Login failed for ${phone}: status ${verified.status} ${message(verified)}`);
    return token;
  }
  throw new Error(`Could not log in ${phone}`);
}

const createdRoomIds: string[] = [];
let graceToken: string | undefined; // kept so the cleanup at the end can reuse her login

async function main() {
  const health = await api('GET', '/health').catch(() => null);
  if (!health || health.status !== 200) {
    console.log(`The API is not answering at ${BASE}. Start it first with: npm.cmd run dev`);
    process.exit(1);
  }

  console.log('Logging in the demo accounts...');
  const admin = await login('0700000001');
  const grace = await login('0700000002'); // approved landlord
  graceToken = grace;
  const peter = await login('0700000003'); // second landlord
  const student = await login('0700000004');

  section('Public search and options');
  check('health endpoint answers', health.status === 200);
  const options = asObject(await api('GET', '/rooms/options'));
  check('room types are the six student-housing types', Array.isArray(options.roomTypes) && options.roomTypes.length === 6, options.roomTypes);
  check('facilities hold amenities only (Wi-Fi yes, "studio" no)', Array.isArray(options.facilities) && options.facilities.includes('Wi-Fi') && !options.facilities.includes('studio'), options.facilities);
  for (const q of ['rwamukundi', 'RWAMUKUNDI', 'heights']) {
    const found = labels(await api('GET', `/rooms?query=${q}`));
    check(`search "${q}" ignores capital letters (finds A1 and A2)`, found.includes('A1') && found.includes('A2'), found);
  }
  const everything = labels(await api('GET', '/rooms'));
  check('occupied room A3 and draft room B1 are NOT listed to students', !everything.includes('A3') && !everything.includes('B1'), everything);
  const badFilter = await api('GET', '/rooms?maxPrice=abc');
  check('a nonsense price filter is refused (400)', badFilter.status === 400, badFilter.status);

  section('Who may do what');
  check('no login on landlord route -> 401', (await api('GET', '/landlord/properties')).status === 401);
  check('student on landlord route -> 403', (await api('GET', '/landlord/properties', student)).status === 403);
  check('admin on landlord route -> 403', (await api('GET', '/landlord/rooms', admin)).status === 403);
  check('no login on admin route -> 401', (await api('GET', '/admin/landlords')).status === 401);
  check('student on admin route -> 403', (await api('GET', '/admin/landlords', student)).status === 403);

  section('Landlord properties');
  const props = asList(await api('GET', '/landlord/properties', grace));
  const prop = props.find((p) => p.name === 'Rwamukundi Heights');
  check("Grace sees her property 'Rwamukundi Heights'", !!prop, props.map((p) => p.name));
  if (!prop) throw new Error('Demo data is missing. Run: npm.cmd run db:seed');
  const propId = String(prop.id);
  const countBefore = Number(prop.roomCount);
  const noName = await api('POST', '/landlord/properties', grace, { district: 'Kabale', area: 'Town' });
  check('adding a property without a name -> 400 with a clear message', noName.status === 400 && message(noName) === 'Property name is required.', noName);
  const peterReads = await api('GET', `/landlord/properties/${propId}`, peter);
  check("Peter cannot read Grace's property (403 or 404)", peterReads.status === 403 || peterReads.status === 404, peterReads.status);

  section('Room life cycle (create, publish, occupy, remove)');
  const label = `SMK${Date.now() % 100000}`;
  const goodRoom = { propertyId: propId, label, roomType: 'Single', price: 300000, deposit: 50000, capacity: 1, description: 'Smoke test room, safe to ignore.', facilities: ['Water', 'Wi-Fi'] };
  const created = await api('POST', '/landlord/rooms', grace, goodRoom);
  const room = asObject(created);
  check('create a room -> 201, draft and available', created.status === 201 && room.listingStatus === 'draft' && room.status === 'available', created);
  const roomId = String(room.id);
  if (created.status === 201) createdRoomIds.push(roomId);
  check('a DRAFT room is not visible to students', !labels(await api('GET', '/rooms')).includes(label));
  const published = await api('PATCH', `/landlord/rooms/${roomId}`, grace, { listingStatus: 'published' });
  check('publish -> 200', published.status === 200 && asObject(published).listingStatus === 'published', published);
  check('a PUBLISHED, available room IS visible to students', labels(await api('GET', '/rooms')).includes(label));
  await api('PATCH', `/landlord/rooms/${roomId}`, grace, { status: 'occupied' });
  check('an OCCUPIED room disappears from student search', !labels(await api('GET', '/rooms')).includes(label));
  const removeOccupied = await api('DELETE', `/landlord/rooms/${roomId}`, grace);
  check('removing an occupied room is refused (409)', removeOccupied.status === 409, removeOccupied);
  await api('PATCH', `/landlord/rooms/${roomId}`, grace, { status: 'available' });
  const removed = await api('DELETE', `/landlord/rooms/${roomId}`, grace);
  check('removing an available room works', removed.status === 200 && asObject(removed).removed === true, removed);
  check('a removed room is gone for the landlord (404)', (await api('GET', `/landlord/rooms/${roomId}`, grace)).status === 404);
  check('a removed room is gone for students', !labels(await api('GET', '/rooms')).includes(label));
  const propsAfter = asList(await api('GET', '/landlord/properties', grace)).find((p) => p.id === propId);
  check('the property room count is back to what it was', Number(propsAfter?.roomCount) === countBefore, propsAfter?.roomCount);
  const reused = await api('POST', '/landlord/rooms', grace, goodRoom);
  check('the label of a removed room can be reused', reused.status === 201, reused);
  if (reused.status === 201) createdRoomIds.push(String(asObject(reused).id));

  section('Validation');
  const villa = await api('POST', '/landlord/rooms', grace, { ...goodRoom, label: 'V1', roomType: 'Villa' });
  check('unknown room type -> 400', villa.status === 400 && message(villa) === 'Choose a valid room type.', villa);
  const free = await api('POST', '/landlord/rooms', grace, { ...goodRoom, label: 'V2', price: 0 });
  check('price 0 -> 400', free.status === 400 && message(free).includes('greater than zero'), free);
  const dup = await api('POST', '/landlord/rooms', grace, { ...goodRoom, label: 'a1' });
  check("duplicate label (a1 vs A1) -> 409", dup.status === 409, dup);
  const jacuzzi = await api('POST', '/landlord/rooms', grace, { ...goodRoom, label: 'V3', facilities: ['Jacuzzi'] });
  check('unknown facility -> 400', jacuzzi.status === 400 && message(jacuzzi) === 'Unknown facility.', jacuzzi);

  section('Ownership');
  const graceRooms = asList(await api('GET', `/landlord/rooms?propertyId=${propId}`, grace));
  const a1 = graceRooms.find((r) => r.label === 'A1');
  check("Grace sees her room A1", !!a1);
  if (a1) {
    const hijack = await api('PATCH', `/landlord/rooms/${String(a1.id)}`, peter, { price: 1 });
    check("Peter cannot edit Grace's room (403 or 404)", hijack.status === 403 || hijack.status === 404, hijack.status);
    const still = asList(await api('GET', `/landlord/rooms?propertyId=${propId}`, grace)).find((r) => r.label === 'A1');
    check("...and A1's price did not change", Number(still?.price) !== 1, still?.price);
  }

  section('Administrator');
  const reviews = asList(await api('GET', '/admin/landlords', admin));
  check('admin sees landlord registrations including Rwamukundi Heights', reviews.some((r) => r.hostelName === 'Rwamukundi Heights'), reviews.length);
  const audit = asList(await api('GET', '/admin/audit', admin));
  check('the audit log recorded the room changes made above', audit.some((e) => e.action === 'room.create') && audit.some((e) => e.action === 'room.remove'), audit.map((e) => e.action).slice(0, 5));
}

main()
  .catch((error) => {
    failed++;
    console.log(`\nSTOPPED: ${error instanceof Error ? error.message : String(error)}`);
  })
  .finally(async () => {
    // Tidy up: remove any test room that is still around.
    try {
      for (const id of createdRoomIds) {
        await api('PATCH', `/landlord/rooms/${id}`, graceToken, { status: 'available' });
        await api('DELETE', `/landlord/rooms/${id}`, graceToken);
      }
    } catch {
      /* best effort */
    }
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });