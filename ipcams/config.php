<?php
// config.php - Main configuration with dynamic camera management
// NO session_start() here

// Database configuration (Option 1 - MySQL)
define('DB_HOST', 'localhost');
define('DB_NAME', 'cctv_system');
define('DB_USER', 'root');
define('DB_PASS', '');

// Use JSON file instead of database (Option 2 - Simpler)
define('USE_DATABASE', false); // Set to true if using MySQL
define('CAMERAS_FILE', __DIR__ . '/cameras.json');

// Security settings
define('API_SECRET_KEY', 'change_this_to_strong_random_key_here');
define('SESSION_TIMEOUT', 3600);

// Role-based permissions
$role_permissions = [
    'admin' => [
        'ptz_control', 'recording_start', 'recording_stop', 
        'snapshot', 'reboot', 'view_live', 'search_footage',
        'export_footage', 'user_management', 'system_settings',
        'manage_cameras'
    ],
    'security' => [
        'ptz_control', 'snapshot', 'view_live', 'search_footage',
        'recording_start', 'recording_stop'
    ],
    'viewer' => [
        'view_live', 'search_footage'
    ]
];

// ============================================
// CAMERA MANAGEMENT FUNCTIONS
// ============================================

// Get all cameras
function getAllCameras() {
    if (USE_DATABASE) {
        return getCamerasFromDatabase();
    } else {
        return getCamerasFromFile();
    }
}

// Get camera by ID
function getCamera($cameraId) {
    $cameras = getAllCameras();
    return $cameras[$cameraId] ?? null;
}

// Add new camera
function addCamera($cameraData) {
    if (USE_DATABASE) {
        return addCameraToDatabase($cameraData);
    } else {
        return addCameraToFile($cameraData);
    }
}

// Update camera
function updateCamera($cameraId, $cameraData) {
    if (USE_DATABASE) {
        return updateCameraInDatabase($cameraId, $cameraData);
    } else {
        return updateCameraInFile($cameraId, $cameraData);
    }
}

// Delete camera
function deleteCamera($cameraId) {
    if (USE_DATABASE) {
        return deleteCameraFromDatabase($cameraId);
    } else {
        return deleteCameraFromFile($cameraId);
    }
}

// Test camera connection
function testCameraConnection($ip, $port, $username, $password) {
    $url = "http://$ip:$port/ISAPI/Streaming/channels/101/picture";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode == 200;
}

// ============================================
// JSON FILE FUNCTIONS (Default - No database needed)
// ============================================

function getCamerasFromFile() {
    if (!file_exists(CAMERAS_FILE)) {
        // Create default cameras file
        $defaultCameras = [
            'camera_001' => [
                'id' => 'camera_001',
                'name' => 'Main Entrance',
                'ip' => '196.39.11.69',
                'port' => 80,
                'username' => 'admin',
                'password' => '12345abc',
                'type' => 'HIKVISION',
                'protocol' => 'http',
                'location' => 'Front Gate',
                'department' => 'Security',
                'enabled' => true,
                'created_at' => date('Y-m-d H:i:s')
            ],
            'camera_002' => [
                'id' => 'camera_002',
                'name' => 'Back Entrance',
                'ip' => '196.39.11.70',
                'port' => 80,
                'username' => 'admin',
                'password' => '12345abc',
                'type' => 'HIKVISION',
                'protocol' => 'http',
                'location' => 'Back Gate',
                'department' => 'Security',
                'enabled' => true,
                'created_at' => date('Y-m-d H:i:s')
            ],
            'camera_003' => [
                'id' => 'camera_003',
                'name' => 'Parking Lot',
                'ip' => '196.39.11.71',
                'port' => 80,
                'username' => 'admin',
                'password' => '12345abc',
                'type' => 'HIKVISION',
                'protocol' => 'http',
                'location' => 'Parking Area',
                'department' => 'Facilities',
                'enabled' => true,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ];
        file_put_contents(CAMERAS_FILE, json_encode($defaultCameras, JSON_PRETTY_PRINT));
        return $defaultCameras;
    }
    
    $content = file_get_contents(CAMERAS_FILE);
    return json_decode($content, true);
}

function addCameraToFile($cameraData) {
    $cameras = getCamerasFromFile();
    
    // Generate unique ID
    $maxId = 0;
    foreach (array_keys($cameras) as $id) {
        if (preg_match('/camera_(\d+)/', $id, $matches)) {
            $maxId = max($maxId, intval($matches[1]));
        }
    }
    $newId = 'camera_' . str_pad($maxId + 1, 3, '0', STR_PAD_LEFT);
    
    $cameraData['id'] = $newId;
    $cameraData['created_at'] = date('Y-m-d H:i:s');
    $cameras[$newId] = $cameraData;
    
    file_put_contents(CAMERAS_FILE, json_encode($cameras, JSON_PRETTY_PRINT));
    return ['success' => true, 'id' => $newId];
}

function updateCameraInFile($cameraId, $cameraData) {
    $cameras = getCamerasFromFile();
    
    if (!isset($cameras[$cameraId])) {
        return ['success' => false, 'error' => 'Camera not found'];
    }
    
    // Preserve original ID and creation date
    $cameraData['id'] = $cameraId;
    $cameraData['created_at'] = $cameras[$cameraId]['created_at'] ?? date('Y-m-d H:i:s');
    $cameraData['updated_at'] = date('Y-m-d H:i:s');
    
    // Merge with existing data
    $cameras[$cameraId] = array_merge($cameras[$cameraId], $cameraData);
    
    file_put_contents(CAMERAS_FILE, json_encode($cameras, JSON_PRETTY_PRINT));
    return ['success' => true];
}

function deleteCameraFromFile($cameraId) {
    $cameras = getCamerasFromFile();
    
    if (!isset($cameras[$cameraId])) {
        return ['success' => false, 'error' => 'Camera not found'];
    }
    
    unset($cameras[$cameraId]);
    file_put_contents(CAMERAS_FILE, json_encode($cameras, JSON_PRETTY_PRINT));
    return ['success' => true];
}

// ============================================
// DATABASE FUNCTIONS (Optional - for MySQL)
// ============================================

function getCamerasFromDatabase() {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create table if not exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS cameras (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            ip VARCHAR(50) NOT NULL,
            port INT DEFAULT 80,
            username VARCHAR(50),
            password VARCHAR(100),
            type VARCHAR(50) DEFAULT 'HIKVISION',
            protocol VARCHAR(10) DEFAULT 'http',
            location VARCHAR(200),
            department VARCHAR(100),
            enabled TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");
        
        $stmt = $pdo->query("SELECT * FROM cameras ORDER BY name");
        $cameras = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['enabled'] = (bool)$row['enabled'];
            $cameras[$row['id']] = $row;
        }
        return $cameras;
    } catch(PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        return [];
    }
}

function addCameraToDatabase($cameraData) {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Generate unique ID
        $newId = 'camera_' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        
        $stmt = $pdo->prepare("INSERT INTO cameras (id, name, ip, port, username, password, type, protocol, location, department, enabled) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $newId,
            $cameraData['name'],
            $cameraData['ip'],
            $cameraData['port'],
            $cameraData['username'],
            $cameraData['password'],
            $cameraData['type'],
            $cameraData['protocol'],
            $cameraData['location'],
            $cameraData['department'],
            $cameraData['enabled'] ? 1 : 0
        ]);
        
        return ['success' => true, 'id' => $newId];
    } catch(PDOException $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function updateCameraInDatabase($cameraId, $cameraData) {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->prepare("UPDATE cameras SET 
            name = ?, ip = ?, port = ?, username = ?, password = ?, 
            type = ?, protocol = ?, location = ?, department = ?, enabled = ?
            WHERE id = ?");
        $stmt->execute([
            $cameraData['name'],
            $cameraData['ip'],
            $cameraData['port'],
            $cameraData['username'],
            $cameraData['password'],
            $cameraData['type'],
            $cameraData['protocol'],
            $cameraData['location'],
            $cameraData['department'],
            $cameraData['enabled'] ? 1 : 0,
            $cameraId
        ]);
        
        return ['success' => true];
    } catch(PDOException $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function deleteCameraFromDatabase($cameraId) {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->prepare("DELETE FROM cameras WHERE id = ?");
        $stmt->execute([$cameraId]);
        
        return ['success' => true];
    } catch(PDOException $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function auditLog($username, $action, $target, $status, $details = '') {
    $logFile = __DIR__ . '/audit_log.json';
    $logs = file_exists($logFile) ? json_decode(file_get_contents($logFile), true) : [];
    
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'username' => $username,
        'action' => $action,
        'target' => $target,
        'status' => $status,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'details' => $details
    ];
    
    array_unshift($logs, $logEntry);
    
    if (count($logs) > 10000) {
        $logs = array_slice($logs, 0, 10000);
    }
    
    file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT));
}

function authenticateUser($username, $password) {
    $users = [
        'admin' => password_hash('Admin123!', PASSWORD_DEFAULT),
        'security' => password_hash('Security123!', PASSWORD_DEFAULT),
        'viewer' => password_hash('Viewer123!', PASSWORD_DEFAULT)
    ];
    
    if (isset($users[$username]) && password_verify($password, $users[$username])) {
        return true;
    }
    return false;
}

function getUserRole($username) {
    $roles = [
        'admin' => 'admin',
        'security' => 'security',
        'viewer' => 'viewer'
    ];
    return $roles[$username] ?? 'viewer';
}

// Initialize cameras global variable for backward compatibility
$cameras = getAllCameras();
?>