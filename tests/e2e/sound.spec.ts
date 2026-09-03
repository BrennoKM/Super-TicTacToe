import { expect, test } from '@playwright/test';

// Som de escrita (spec SOM): clipes reais servidos de public/sounds/, sem
// erro de rede/decodificação, e créditos visíveis (licença de atribuição).

test('clipes de som carregam sem erro em ambos os temas (REQ-SOM-01..03)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().includes('/sounds/') && !r.ok()) errors.push(`${r.status()} ${r.url()}`);
  });

  await page.goto('/');
  await page.getByTestId('start').click();

  // Tema caderno: X, O e um risco pequeno.
  await page.getByTestId('cell-4.0').click(); // X
  await page.getByTestId('cell-0.4').click(); // O
  await page.waitForTimeout(400);

  // Tema lousa.
  await page.getByTestId('theme-toggle').click();
  await page.getByTestId('cell-4.1').click();
  await page.waitForTimeout(400);

  expect(errors).toEqual([]);
});

test('desfazer não solicita clipe novo (RN-SOM-05)', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/sounds/')) requests.push(r.url());
  });
  await page.goto('/');
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.4').click();
  await page.waitForTimeout(300);
  const before = requests.length;
  await page.getByTestId('undo').click();
  await page.waitForTimeout(300);
  expect(requests.length).toBe(before); // nada novo pedido ao desfazer
});

test('créditos das gravações aparecem no rodapé (licença de atribuição)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sound-credits')).toContainText('soundbible.com');
});
