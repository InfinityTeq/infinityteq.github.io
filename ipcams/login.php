<?php
// login.php - User login page
session_start();
require_once 'config.php';

if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (authenticateUser($username, $password)) {
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = getUserRole($username);
        $_SESSION['login_time'] = time();
        
        auditLog($username, 'LOGIN', 'system', 'SUCCESS', 'Login successful');
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid username or password';
        auditLog($username, 'LOGIN', 'system', 'FAILED', 'Failed login attempt');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - CCTV Management System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .login-container {
            background: #0f0f1a;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            width: 100%;
            max-width: 400px;
            overflow: hidden;
            border: 1px solid #2c3e66;
        }
        
        .login-header {
            background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
            padding: 30px;
            text-align: center;
        }
        
        .login-header h1 {
            color: #00d4ff;
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .login-header p {
            color: #8899aa;
            font-size: 13px;
        }
        
        .login-body {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #8899aa;
            font-size: 13px;
            font-weight: 500;
        }
        
        input {
            width: 100%;
            padding: 12px 15px;
            background: #1a1a2e;
            border: 1px solid #2c3e66;
            border-radius: 8px;
            color: #eee;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #00d4ff;
            box-shadow: 0 0 5px rgba(0,212,255,0.3);
        }
        
        button {
            width: 100%;
            padding: 12px;
            background: #00d4ff;
            color: #16213e;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        button:hover {
            background: #00b8e6;
        }
        
        .error {
            background: rgba(231,76,60,0.2);
            border-left: 3px solid #e74c3c;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #e74c3c;
        }
        
        .info {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #556677;
        }
        
        .credentials-hint {
            margin-top: 20px;
            padding: 15px;
            background: #1a1a2e;
            border-radius: 8px;
            font-size: 12px;
        }
        
        .credentials-hint summary {
            cursor: pointer;
            color: #00d4ff;
            font-weight: bold;
        }
        
        .credentials-hint code {
            display: block;
            background: #0f0f1a;
            padding: 8px;
            margin: 8px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 11px;
            color: #00d4ff;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🎥 CCTV Management</h1>
            <p>Secure Camera Control System</p>
        </div>
        <div class="login-body">
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required autofocus>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            
            <div class="info">
                Authorized personnel only. All access is logged.
            </div>
            
            <details class="credentials-hint">
                <summary>⚠️ Default Credentials (Change after first login)</summary>
                <code>Username: admin | Password: Admin123!</code>
                <code>Username: security | Password: Security123!</code>
                <code>Username: viewer | Password: Viewer123!</code>
            </details>
        </div>
    </div>
</body>
</html>