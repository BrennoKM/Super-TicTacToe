import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Fluxo do modo local (REQ-STT-04, 07, 08, 09, 10, 12; AC-STT-01, 02).

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
}

test('jogada direciona o adversário e destaca o tabuleiro permitido (AC-STT-01)', async ({ page }) => {
  await startGame(page);
  // X joga na célula 0 do tabuleiro 4.
  await page.getByTestId('cell-4.0').click();
  // O tabuleiro 0 fica destacado como jogável; os outros não.
  await expect(page.getByTestId('board-0')).toHaveClass(/playable/);
  await expect(page.getByTestId('board-4')).not.toHaveClass(/playable/);
  await expect(page.getByTestId('status')).toContainText('Bia');
});

test('jogada fora do tabuleiro obrigatório é rejeitada (AC-STT-02)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click(); // O obrigado ao tabuleiro 0
  // Célula de outro tabuleiro está desabilitada; clicar não muda nada.
  const forbidden = page.getByTestId('cell-8.8');
  await expect(forbidden).toBeDisabled();
  await forbidden.click({ force: true });
  await expect(forbidden).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Bia');
});

test('desfazer volta a última jogada (REQ-STT-07)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click();
  await expect(page.getByTestId('cell-4.0')).toHaveText('X');
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('cell-4.0')).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Ana');
});

test('histórico registra as jogadas (REQ-STT-10)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click();
  await page.getByTestId('cell-0.4').click();
  const items = page.getByTestId('history').locator('li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('X');
});

test('partida completa termina com anúncio, placar e revanche (AC-STT-04, REQ-STT-08, 09)', async ({ page }) => {
  await startGame(page);
  // Roteiro em que X (Ana) conquista os tabuleiros 0, 1 e 2 (validado no motor).
  const script = [
    '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
    '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
  ];
  for (const move of script) {
    await page.getByTestId(`cell-${move}`).click();
  }
  await expect(page.getByTestId('status')).toContainText('Ana');
  await expect(page.getByTestId('score')).toContainText('Ana (X): 1');

  // Revanche: novo tabuleiro, mesmo confronto, agora O (Bia) começa.
  await page.getByTestId('rematch').click();
  await expect(page.getByTestId('cell-0.6')).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Bia');
  await expect(page.getByTestId('score')).toContainText('Ana (X): 1');
});
