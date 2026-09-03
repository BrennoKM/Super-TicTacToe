import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Modo online (REQ-STT-06, 15; AC-STT-09, 11, 12) com o transporte
// BroadcastChannel (mesma origem), que exercita todo o protocolo sem broker.

async function openApp(page: Page) {
  await page.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await page.goto('/');
}

async function createRoom(host: Page, name: string): Promise<string> {
  await openApp(host);
  await host.getByTestId('mode-online').click();
  await host.getByTestId('name-1').fill(name);
  await host.getByTestId('start').click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  return (await host.getByTestId('room-code').first().innerText()).trim();
}

async function joinRoom(guest: Page, code: string, name: string) {
  await openApp(guest);
  await guest.getByTestId('join-code').fill(code);
  await guest.getByTestId('join-go').click();
  await guest.getByTestId('name-1').fill(name);
  await guest.getByTestId('start').click();
}

test('sala p2p: criar, entrar e jogar (AC-STT-12, AC-STT-01 online)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');

  // Conexão estabelecida: os dois veem o tabuleiro e os nomes.
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });
  await expect(guest.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  // Host (X) joga; a jogada aparece pro guest e o turno passa.
  await host.getByTestId('cell-4.0').click();
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');
  await expect(guest.getByTestId('status')).toContainText('Bia');

  // Guest joga de volta; o host vê.
  await guest.getByTestId('cell-0.4').click();
  await expect(host.getByTestId('cell-0.4')).toHaveText('O');
  await expect(host.getByTestId('status')).toContainText('Ana');

  // O guest não consegue jogar fora da vez: clique ignorado.
  await guest.getByTestId('cell-4.1').click({ force: true });
  await expect(guest.getByTestId('cell-4.1')).toHaveText('');
});

test('desfazer no p2p exige consentimento; recusa mantém tudo (AC-STT-09)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  await host.getByTestId('cell-4.0').click();
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');

  // Host pede pra desfazer; guest recusa.
  await host.getByTestId('undo').click();
  await expect(guest.getByTestId('undo-dialog')).toBeVisible();
  await guest.getByTestId('undo-reject').click();

  await expect(host.getByTestId('undo-denied')).toBeVisible();
  await expect(host.getByTestId('cell-4.0')).toHaveText('X');
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');

  // Agora pede de novo e o guest aceita: a jogada some nos dois lados.
  await host.getByTestId('undo').click();
  await expect(guest.getByTestId('undo-dialog')).toBeVisible();
  await guest.getByTestId('undo-accept').click();
  await expect(host.getByTestId('cell-4.0')).toHaveText('');
  await expect(guest.getByTestId('cell-4.0')).toHaveText('');
});

// RN-CONEXAO-08: jogada nova depois do pedido de desfazer invalida o
// pedido, o aviso não pode continuar aceitável senão o aceite faz um
// rollback maior do que o esperado.
test('jogada nova depois do pedido de desfazer invalida o pedido (RN-CONEXAO-08)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  // Host joga; agora é a vez do guest, e o host pede pra desfazer aquela jogada.
  await host.getByTestId('cell-4.0').click();
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');
  await host.getByTestId('undo').click();
  await expect(guest.getByTestId('undo-dialog')).toBeVisible();

  // Antes de responder, o guest joga (é a vez dele mesmo com o pedido em aberto).
  await guest.getByTestId('cell-0.4').click();
  await expect(host.getByTestId('cell-0.4')).toHaveText('O');

  // O aviso some sozinho: aceitar agora faria um rollback maior do que o pedido original.
  await expect(guest.getByTestId('undo-dialog')).toBeHidden();

  // As duas jogadas continuam de pé nos dois lados.
  await expect(host.getByTestId('cell-4.0')).toHaveText('X');
  await expect(host.getByTestId('cell-0.4')).toHaveText('O');
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');
  await expect(guest.getByTestId('cell-0.4')).toHaveText('O');
});

test('reconexão: recarregar no meio da partida retoma do ponto exato (AC-STT-11)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  await host.getByTestId('cell-4.0').click();
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X');
  await guest.getByTestId('cell-0.4').click();
  await expect(host.getByTestId('cell-0.4')).toHaveText('O');

  // Queda do guest: recarrega a página e retoma pela sala salva.
  await guest.reload();
  await expect(guest.getByTestId('online-resume-dialog')).toBeVisible();
  await guest.getByTestId('online-resume').click();

  // Partida volta no ponto exato e segue jogável dos dois lados.
  await expect(guest.getByTestId('cell-4.0')).toHaveText('X', { timeout: 5000 });
  await expect(guest.getByTestId('cell-0.4')).toHaveText('O');
  await expect(guest.getByTestId('status')).toContainText('Ana');
  await host.getByTestId('cell-4.1').click();
  await expect(guest.getByTestId('cell-4.1')).toHaveText('X');
});

test('encerrar a sala avisa o adversário (RN-CONEXAO-02, AC-CONEXAO-07)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  // Partida em andamento pede confirmação (AC-CONEXAO-06).
  await guest.getByTestId('end-match').first().click();
  await expect(guest.getByTestId('leave-dialog')).toBeVisible();
  await guest.getByTestId('leave-cancel').click();
  await expect(guest.getByTestId('leave-dialog')).toBeHidden();
  await expect(host.getByTestId('status')).toBeVisible();

  await guest.getByTestId('end-match').first().click();
  await guest.getByTestId('leave-confirm').click();
  await expect(host.getByTestId('online-ended')).toBeVisible();
});

test('sala abandonada não aceita mais ninguém (AC-CONEXAO-01)', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');

  // O criador desiste antes de alguém entrar.
  await host.getByRole('button', { name: /Voltar|Back/ }).click();
  await expect(host.getByTestId('mode-online')).toBeVisible();

  // Quem tenta entrar recebe erro, em vez de conectar numa sala fantasma.
  await joinRoom(guest, code, 'Bia');
  await expect(guest.getByTestId('online-error')).toBeVisible({ timeout: 10_000 });
});

test('criar sala de novo após sair funciona (AC-CONEXAO-02)', async ({ context }) => {
  const host = await context.newPage();
  const first = await createRoom(host, 'Ana');
  await host.getByRole('button', { name: /Voltar|Back/ }).click();
  await expect(host.getByTestId('mode-online')).toBeVisible();

  await host.getByTestId('mode-online').click();
  await host.getByTestId('start').click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  const second = (await host.getByTestId('room-code').first().innerText()).trim();
  expect(second).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  expect(second).not.toBe('');
  void first;
});

test('entrar em código inexistente falha com saída, sem travar (AC-CONEXAO-03, RN-CONEXAO-05)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await page.goto('/');
  await page.getByTestId('join-code').fill('ZZZZZZ');
  await page.getByTestId('join-go').click();
  await page.getByTestId('start').click();

  await expect(page.getByTestId('online-error')).toBeVisible({ timeout: 10_000 });
  // Sempre há saída da tela de erro.
  await page.getByRole('button', { name: /Voltar|Back/ }).click();
  await expect(page.getByTestId('mode-online')).toBeVisible();
});
