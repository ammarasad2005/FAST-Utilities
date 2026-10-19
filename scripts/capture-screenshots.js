const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const TIMETABLE_QUERY = 'batch=2023&dept=SE&section=A';
const EXAM_QUERY = 'batch=2024&school=FSC&dept=CS';

async function waitAndCapture(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `Screenshots/${name}.png` });
}

async function openExamDetail(page) {
  await page.locator('.exam-card').first().click();
}

async function openTimetableDetail(page) {
  await page.locator('.timetable-card').first().click();
}

async function showRoomSpecificResults(page) {
  await page.selectOption('#day-select', { index: 1 });
  await page.selectOption('#slot-select', { index: 1 });
  await page.getByRole('button', { name: 'Find Free Rooms' }).click();
}

async function openRoomDetail(page) {
  await page.locator('table tbody td').first().click();
}

async function runCaptureSet(mobile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
        }
      : {
          viewport: { width: 1280, height: 720 },
        }
  );

  const page = await context.newPage();
  const suffix = mobile ? 'mobile' : 'desktop';

  // Home / configuration
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await waitAndCapture(page, `configuration_page_${suffix}`);

  // Exams
  await page.goto(`${BASE_URL}/schedule?${EXAM_QUERY}`, { waitUntil: 'networkidle' });
  await openExamDetail(page);
  await waitAndCapture(page, `schedule_detail_${suffix}`);

  // Timetable (non-2022 only)
  await page.goto(`${BASE_URL}/timetable?${TIMETABLE_QUERY}`, { waitUntil: 'networkidle' });
  await openTimetableDetail(page);
  await waitAndCapture(page, `timetable_detail_${suffix}`);

  // Custom Exams
  await page.goto(`${BASE_URL}/custom`, { waitUntil: 'networkidle' });
  await waitAndCapture(page, `custom_exams_page_${suffix}`);

  // Custom Timetable
  await page.goto(`${BASE_URL}/timetable/custom`, { waitUntil: 'networkidle' });
  await waitAndCapture(page, `custom_timetable_page_${suffix}`);

  // Rooms
  await page.goto(`${BASE_URL}/rooms`, { waitUntil: 'networkidle' });
  // Rooms configured + detail mode
  await showRoomSpecificResults(page);
  await openRoomDetail(page);
  await waitAndCapture(page, `rooms_detail_${suffix}`);

  await context.close();
  await browser.close();
}

async function main() {
  await runCaptureSet(false);
  await runCaptureSet(true);
  // eslint-disable-next-line no-console
  console.log('Captured screenshot sets for desktop and mobile.');
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
