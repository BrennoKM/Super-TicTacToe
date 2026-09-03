import { expect, test } from '@playwright/test';

// Modo contra o bot (REQ-STT-05; AC-STT-07, AC-STT-08 na interface).

test('bot responde à jogada humana em tempo perceptivelmente imediato', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode').selectOption('bot');
  await page.getByTestId('difficulty').selectOption('easy');
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('start').click();

  await page.getByTestId('cell-4.4').click();
  await expect(page.getByTestId('cell-4.4')).toHaveText('X');

  // O bot (O) responde sozinho; o histórico passa a ter 2 jogadas.
  await expect(page.getByTestId('history').locator('li')).toHaveCount(2, {
    timeout: 3000,
  });
  await expect(page.getByTestId('status')).toContainText('Ana');
});

test('desfazer contra o bot desfaz o par de jogadas (AC-STT-08)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode').selectOption('bot');
  await page.getByTestId('difficulty').selectOption('easy');
  await page.getByTestId('start').click();

  await page.getByTestId('cell-4.4').click();
  await expect(page.getByTestId('history').locator('li')).toHaveCount(2, {
    timeout: 3000,
  });

  await page.getByTestId('undo').click();
  await expect(page.getByTestId('history').locator('li')).toHaveCount(0);
  await expect(page.getByTestId('cell-4.4')).toHaveText('');
});

test('partida contra o bot é retomável e mantém o modo (REQ-STT-14)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode').selectOption('bot');
  await page.getByTestId('difficulty').selectOption('easy');
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('start').click();

  await page.getByTestId('cell-4.4').click();
  await expect(page.getByTestId('history').locator('li')).toHaveCount(2, {
    timeout: 3000,
  });

  await page.reload();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('history').locator('li')).toHaveCount(2);
  // Rótulo do bot presente no placar confirma que o modo sobreviveu.
  await expect(page.getByTestId('score')).toContainText('Bot');
});
