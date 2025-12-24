<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT prompt, response, created_at FROM chats WHERE user_id = ? ORDER BY created_at ASC");
$stmt->execute([$user_id]);
$history = $stmt->fetchAll();

echo json_encode(['success' => true, 'history' => $history]);
