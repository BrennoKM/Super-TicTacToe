import { expect, test } from '@playwright/test';

// AC-STT-13 / REQ-STT-11: tabuleiro legível e tocável em tela de celular.
test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

test('tabuleiro cabe na tela do celular e as células são tocáveis', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();

  // Sem rolagem horizontal.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  // O tabuleiro inteiro cabe na largura da viewport.
  const board = page.getByTestId('board-root');
  const box = (await board.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(375);

  // Célula tocável: área mínima razoável e o toque registra a jogada.
  const cell = page.getByTestId('cell-4.4');
  const cellBox = (await cell.boundingBox())!;
  expect(cellBox.width).toBeGreaterThanOrEqual(24);
  await cell.tap();
  await expect(cell).toHaveText('X');
});
