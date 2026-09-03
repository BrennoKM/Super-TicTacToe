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
  await host.getByTestId('mode').selectOption('online');
  await host.getByTestId('name-1').fill(name);
  await host.getByTestId('start').click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  return (await host.getByTestId('room-code').first().innerText()).trim();
}

async function joinRoom(guest: Page, code: string, name: string) {
  await openApp(guest);
  await guest.getByTestId('mode').selectOption('online');
  await guest.getByTestId('online-action').selectOption('join');
  await guest.getByTestId('name-1').fill(name);
  await guest.getByTestId('join-code').fill(code);
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

test('encerrar a sala avisa o adversário', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await createRoom(host, 'Ana');
  await joinRoom(guest, code, 'Bia');
  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });

  await guest.getByTestId('end-match').first().click();
  await expect(host.getByTestId('online-ended')).toBeVisible();
});
