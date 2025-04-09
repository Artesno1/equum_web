<?php
// Включаем логирование
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Создаем папку для логов, если не существует
$log_dir = 'logs';
if (!file_exists($log_dir)) {
    mkdir($log_dir, 0755, true);
}

// Настройки заголовков
header('Content-Type: application/json');

// Загружаем конфигурацию из env файла или используем значения по умолчанию
$config = parse_ini_file('.env');
$api_url = $config['API_URL'] ?? getenv('API_URL') ?? 'https://api.equum.ru';
$api_timeout = $config['API_TIMEOUT'] ?? getenv('API_TIMEOUT') ?? 10;

// Валидация и санитизация path параметра
$path = isset($_GET['path']) ? filter_var($_GET['path'], FILTER_SANITIZE_URL) : '/api/order';
if (!preg_match('/^\/api\/[a-zA-Z0-9\/_-]+$/', $path)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid API path'
    ]);
    exit;
}

$url = $api_url . $path;

// Получаем метод и тело запроса
$method = $_SERVER['REQUEST_METHOD'];
$input = file_get_contents('php://input');

// Декодируем JSON для логирования
$decoded_input = json_decode($input, true);

// Проверяем обязательные поля для POST запросов на создание заказа
if ($method === 'POST' && strpos($path, '/api/order') !== false) {
    if (empty($decoded_input['name']) || empty($decoded_input['phone'])) {
        // Записываем в лог отсутствие обязательных полей
        file_put_contents("$log_dir/validation_error-" . time() . ".json", json_encode([
            'error' => 'Отсутствуют обязательные поля',
            'received_data' => $decoded_input,
            'required_fields' => ['name', 'phone']
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        // Возвращаем ошибку
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Отсутствуют обязательные поля (name и phone)'
        ]);
        exit;
    }
}

// Логируем запрос
$request_log = [
    'timestamp' => date('Y-m-d H:i:s'),
    'url' => $url,
    'method' => $method,
    'request_data' => $decoded_input,
    'raw_request_data' => $input
];

file_put_contents("$log_dir/request-" . time() . ".json", json_encode($request_log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Добавляем защиту от CSRF
if ($method === 'POST') {
    $headers = getallheaders();
    if (!isset($headers['X-Requested-With']) || $headers['X-Requested-With'] !== 'XMLHttpRequest') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'CSRF validation failed'
        ]);
        exit;
    }
}

// Создаем контекст запроса с улучшенной безопасностью
$options = [
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: Equum-Website-Proxy/1.0',
            'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'],
            'X-Request-ID: ' . uniqid('req_')
        ]) . "\r\n",
        'content' => $input,
        'ignore_errors' => true,
        'timeout' => $api_timeout,
        'verify_peer' => true,
        'verify_peer_name' => true
    ]
];

// Выполняем запрос с обработкой ошибок
$context = stream_context_create($options);
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    $response = file_get_contents($url, false, $context);
    $http_response_code = $http_response_header[0];
    preg_match('{HTTP/\S*\s(\d+)}', $http_response_header[0], $match);
    $status_code = $match[1] ?? 500;
} catch (Exception $e) {
    $response = false;
    $status_code = 503;
    error_log("API request failed: " . $e->getMessage());
}

restore_error_handler();

// Логируем ответ
$response_log = [
    'timestamp' => date('Y-m-d H:i:s'),
    'url' => $url,
    'method' => $method,
    'status_code' => $http_response_code,
    'response_data' => $response ? json_decode($response, true) : null,
    'raw_response' => $response,
    'headers' => isset($http_response_header) ? $http_response_header : []
];

file_put_contents("$log_dir/response-" . time() . ".json", json_encode($response_log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Обработка ответа и ошибок
if ($response === FALSE || $status_code >= 400) {
    $error_message = ($response === FALSE) ? "Connection failed" : "Error: $status_code";
    error_log("API Error: $error_message");
    
    // Определяем код ответа на основе типа ошибки
    $response_code = $response === FALSE ? 503 : $status_code;
    
    if ($method === 'POST' && strpos($path, '/api/order') !== false) {
        // Создаем уникальный ID для заказа
        $generated_id = 'web_' . time() . '_' . bin2hex(random_bytes(4));
        
        // Создаем директорию для очереди если её нет
        $queue_dir = "$log_dir/queue";
        if (!file_exists($queue_dir)) {
            mkdir($queue_dir, 0755, true);
        }
        
        // Сохраняем заказ для последующей синхронизации
        $order_data = [
            'id' => $generated_id,
            'name' => $decoded_input['name'] ?? 'Неизвестный клиент',
            'phone' => $decoded_input['phone'] ?? 'Нет номера',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'needs_sync' => true,
            'original_request' => $decoded_input,
            'error_details' => $error_message
        ];
        
        // Сохраняем в очередь
        file_put_contents(
            "$queue_dir/order-$generated_id.json",
            json_encode($order_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
        
        // Возвращаем ответ с пометкой об автономном режиме
        http_response_code(207); // Multi-Status для индикации частичной обработки
        echo json_encode([
            'success' => true,
            'id' => $generated_id,
            'status' => 'pending',
            'message' => 'Заказ принят в автономном режиме и будет обработан позже',
            'proxy_error' => true,
            'error_details' => $error_message,
            'requires_sync' => true
        ]);
    } else {
        // Для остальных запросов возвращаем ошибку с оригинальным кодом
        http_response_code($response_code);
        echo json_encode([
            'success' => false,
            'error' => $error_message,
            'proxy_error' => true,
            'status_code' => $response_code
        ]);
    }
} else {
    // Проверяем валидность JSON ответа
    $decoded_response = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid JSON response from API',
            'proxy_error' => true
        ]);
    } else {
        // Возвращаем успешный ответ с оригинальным кодом состояния
        http_response_code($status_code);
        echo $response;
    }
}
?>