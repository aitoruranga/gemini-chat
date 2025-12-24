<?php
session_start();
require_once 'db.php';
require_once 'config.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$prompt = $data['prompt'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;
$ip_address = $_SERVER['REMOTE_ADDR'];

// Increase execution time for long responses
set_time_limit(180);

if (empty($prompt)) {
    echo json_encode(['success' => false, 'message' => 'Mezua ezin da hutsik egon']);
    exit;
}

// Prepare payload for Gemini API
$url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

$requestData = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.7,
        'maxOutputTokens' => 8192 // Increased from 800 to allow longer responses
    ]
];

$jsonData = json_encode($requestData);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 120); // 2 minutes cURL timeout

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError || $httpCode !== 200) {
    // Log failure
    $errorDetails = $curlError ?: "HTTP Code: $httpCode. Response: $response";
    $stmt = $pdo->prepare("INSERT INTO logs (user_id, prompt, result, ip_address, details) VALUES (?, ?, 'failure', ?, ?)");
    $stmt->execute([$user_id, $prompt, $ip_address, $errorDetails]);

    echo json_encode(['success' => false, 'message' => 'Error al contactar con Gemini API']);
    exit;
}

$decodedResponse = json_decode($response, true);
$aiText = $decodedResponse['candidates'][0]['content']['parts'][0]['text'] ?? '';

if ($aiText) {
    // Log success
    $stmt = $pdo->prepare("INSERT INTO logs (user_id, prompt, result, ip_address, details) VALUES (?, ?, 'success', ?, 'Response generated')");
    $stmt->execute([$user_id, $prompt, $ip_address]);

    // Save chat if user is logged in
    if ($user_id) {
        $stmt = $pdo->prepare("INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $prompt, $aiText]);
    }

    echo json_encode(['success' => true, 'response' => $aiText]);
} else {
    // Log unexpected API response format
    $stmt = $pdo->prepare("INSERT INTO logs (user_id, prompt, result, ip_address, details) VALUES (?, ?, 'failure', ?, ?)");
    $stmt->execute([$user_id, $prompt, $ip_address, 'Invalid API format: ' . substr($response, 0, 200)]);

    echo json_encode(['success' => false, 'message' => 'Respuesta inválida de la API']);
}
