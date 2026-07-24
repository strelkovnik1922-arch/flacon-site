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

// пересобираем payload: только ожидаемые поля, без управляющих символов, с лимитами длины.
// Клиентский текст дальше идёт в Telegram как ПЛЕЙН-ТЕКСТ (без parse_mode) — код/разметка не исполнятся.
function clean_str($s, $max) {
  $s = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string)$s);
  return mb_substr(trim($s), 0, $max);
}
$items = [];
if ($hasItems) {
  foreach ($o['items'] as $it) {
    if (!is_array($it)) continue;
    $items[] = [
      'code'  => clean_str(isset($it['code']) ? $it['code'] : '', 40),
      'price' => (float)(isset($it['price']) ? $it['price'] : 0),
      'qty'   => (int)(isset($it['qty']) ? $it['qty'] : 0),
    ];
    if (count($items) >= 100) break;
  }
}
$payload = json_encode([
  'name'  => clean_str(isset($o['name']) ? $o['name'] : '', 80),
  'phone' => clean_str($o['phone'], 40),
  'note'  => clean_str(isset($o['note']) ? $o['note'] : '', 1000),
  'items' => $items,
], JSON_UNESCAPED_UNICODE);

$BOT = 'http://85.209.3.16:8081/order';
$ch = curl_init($BOT);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
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
