<?php
// Flacon KZ — приём заявки с сайта и пересылка боту-серверу.
// Токен бота здесь НЕ хранится: заявка уходит на бот-сервер, он шлёт её в Telegram.
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
if (!$raw || strlen($raw) > 100000) {
  http_response_code(400);
  echo '{"ok":false,"error":"empty"}';
  exit;
}

// валидно: телефон + (товары ИЛИ описание для поиска под клиента)
$o = json_decode($raw, true);
$hasItems = !empty($o['items']) && is_array($o['items']);
$hasNote = !empty($o['note']) && is_string($o['note']) && strlen(trim($o['note'])) > 2;
if (!$o || empty($o['phone']) || (!$hasItems && !$hasNote)) {
  http_response_code(400);
  echo '{"ok":false,"error":"invalid"}';
  exit;
}

$BOT = 'http://85.209.3.16:8081/order';
$ch = curl_init($BOT);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $raw,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT        => 12,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code === 200) {
  echo '{"ok":true}';
} else {
  // заявку не потеряем: продублируем в файл на всякий случай
  @file_put_contents(__DIR__ . '/data/orders_backup.jsonl', $raw . "\n", FILE_APPEND | LOCK_EX);
  http_response_code(502);
  echo '{"ok":false,"error":"relay"}';
}
