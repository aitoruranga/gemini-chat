<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'register') {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'El usuario ya existe']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");

        if ($stmt->execute([$username, $hash])) {
            echo json_encode(['success' => true, 'message' => 'Usuario registrado correctamente']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al registrar usuario']);
        }
    } elseif ($action === 'login') {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;

            // Log login success
            $stmt = $pdo->prepare("INSERT INTO logs (user_id, result, ip_address, details, prompt) VALUES (?, 'success', ?, 'Login successful', 'LOGIN_ATTEMPT')");
            $stmt->execute([$user['id'], $_SERVER['REMOTE_ADDR']]);

            echo json_encode(['success' => true, 'message' => 'Login exitoso', 'username' => $username]);
        } else {
            // Log login failure
            $stmt = $pdo->prepare("INSERT INTO logs (user_id, result, ip_address, details, prompt) VALUES (NULL, 'failure', ?, 'Login failed for user: $username', 'LOGIN_ATTEMPT')");
            $stmt->execute([$_SERVER['REMOTE_ADDR']]);

            echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        }
    } elseif ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logout exitoso']);
    }
} elseif ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(['logged_in' => true, 'username' => $_SESSION['username']]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
}
