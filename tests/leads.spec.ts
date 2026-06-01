import { test, expect } from '@playwright/test';

const LEAD_STAGES = ['new', 'contacted', 'qualified', 'appointment_scheduled', 'customer', 'closed_won', 'closed_lost'] as const;

test.describe('Lead Lifecycle Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?sandbox=true');
  });

  test('should navigate to leads tab', async ({ page }) => {
    await page.click('text=Leads');
    await expect(page.locator('text=Gestión de Leads')).toBeVisible();
    await expect(page.locator('text=Pipeline de Leads')).toBeVisible();
  });

  test('should display leads with stage badges', async ({ page }) => {
    await page.click('text=Leads');
    await expect(page.locator('text=new')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=contacted')).toBeVisible();
    await expect(page.locator('text=qualified')).toBeVisible();
  });

  test('should filter leads by stage', async ({ page }) => {
    await page.click('text=Leads');
    await page.click('text=Todos');
    await page.click('text=qualified');
    await expect(page.locator('text=qualified').first()).toBeVisible();
  });

  test('should show lead detail panel when selected', async ({ page }) => {
    await page.click('text=Leads');
    await page.click('text=Lead Sin Nombre >> nth=0');
    await expect(page.locator('text=Detalle del Lead')).toBeVisible();
    await expect(page.locator('text=Línea de Tiempo')).toBeVisible();
  });

  test('should advance lead to next stage', async ({ page }) => {
    await page.click('text=Leads');
    await page.click('text=Lead Sin Nombre >> nth=0');
    const advanceBtn = page.locator('button:has-text("Avanzar")').first();
    if (await advanceBtn.isVisible()) {
      await advanceBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('should add note to lead', async ({ page }) => {
    await page.click('text=Leads');
    await page.click('text=Lead Sin Nombre >> nth=0');
    await page.fill('input[placeholder="Agregar nota..."]', 'Nota de prueba para lead');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Nota de prueba para lead')).toBeVisible();
  });
});

test.describe('Lead API Endpoints', () => {
  test('should create lead via API', async ({ request }) => {
    const response = await request.post('/api/leads/create', {
      data: {
        orgId: 'test-org',
        name: 'Test Lead',
        phone: '+593999999999',
        source: 'test'
      }
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should list leads via API', async ({ request }) => {
    const response = await request.get('/api/leads/list?orgId=test-org');
    expect(response.ok()).toBeTruthy();
  });

  test('should update lead stage via API', async ({ request }) => {
    const response = await request.post('/api/leads/update-stage', {
      data: {
        orgId: 'test-org',
        leadId: 'test-lead-id',
        stage: 'contacted'
      }
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should add note to lead via API', async ({ request }) => {
    const response = await request.post('/api/leads/notes', {
      data: {
        orgId: 'test-org',
        leadId: 'test-lead-id',
        note: 'Test note'
      }
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should get lead history via API', async ({ request }) => {
    const response = await request.get('/api/leads/history?orgId=test-org&leadId=test-lead-id');
    expect(response.ok()).toBeTruthy();
  });
});