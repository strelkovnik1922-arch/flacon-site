<?php
// Flacon KZ — приём заявки с сайта и пересылка боту-серверу.
// Токен бота здесь НЕ хранится: заявка уходит на бот-сервер, он шлёт её в Telegram.
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
if (!$raw || strlen($raw) > 9000000) { // до ~9 МБ: заявка + фото (5 МБ) в base64
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
// фото (заявка на поиск): только data:image jpg/png/webp, до ~6.8 МБ base64 (=5 МБ файл)
$photo = '';
if (!empty($o['photo']) && is_string($o['photo'])
    && preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#', $o['photo'])
    && strlen($o['photo']) <= 7000000) {
  $photo = $o['photo'];
}
$out = [
  'name'    => clean_str(isset($o['name']) ? $o['name'] : '', 80),
  'phone'   => clean_str($o['phone'], 40),
  'note'    => clean_str(isset($o['note']) ? $o['note'] : '', 1000),
  'contact' => clean_str(isset($o['contact']) ? $o['contact'] : '', 20),   // WhatsApp / Telegram
  'city'    => clean_str(isset($o['city']) ? $o['city'] : '', 60),
  'address' => clean_str(isset($o['address']) ? $o['address'] : '', 200),
  'items'   => $items,
];
if ($photo) $out['photo'] = $photo;
$payload = json_encode($out, JSON_UNESCAPED_UNICODE);

$BOT = 'http://85.209.3.16:8081/order';
$ch = curl_init($BOT);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT        => 25,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code === 200) {
  // прокидываем ответ бота как есть — там номер заказа МойСклада для показа клиенту
  $j = json_decode($resp, true);
  if (is_array($j) && !empty($j['ok'])) {
    echo json_encode(['ok' => true, 'order' => isset($j['order']) ? $j['order'] : null, 'bot' => isset($j['bot']) ? $j['bot'] : null]);
  } else {
    echo '{"ok":true}';
  }
} else {
  // заявку не потеряем: продублируем в файл на всякий случай
  @file_put_contents(__DIR__ . '/data/orders_backup.jsonl', $raw . "\n", FILE_APPEND | LOCK_EX);
  http_response_code(502);
  echo '{"ok":false,"error":"relay"}';
}
