<?php
// api.php - Backend API with dynamic cameras
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid request format']);
    exit;
}

$cameraId = $input['camera_id'] ?? '';
$command = strtoupper($input['command'] ?? '');

if (!$cameraId || !$command) {
    echo json_encode(['success' => false, 'error' => 'Missing camera_id or command']);
    exit;
}

// Get cameras dynamically from JSON file
$cameras = getAllCameras();

if (!isset($cameras[$cameraId])) {
    // Check if there's test data for connection testing
    if (isset($input['test_data'])) {
        $testData = $input['test_data'];
        $camera = [
            'ip' => $testData['ip'],
            'port' => $testData['port'],
            'username' => $testData['username'],
            'password' => $testData['password'],
            'type' => 'HIKVISION'
        ];
    } else {
        echo json_encode(['success' => false, 'error' => 'Camera not found']);
        exit;
    }
} else {
    $camera = $cameras[$cameraId];
}

// Check permissions based on user role
$userRole = $_SESSION['role'] ?? 'viewer';
$allowedCommands = $role_permissions[$userRole] ?? $role_permissions['viewer'];

// Define command permissions mapping
$commandPermissions = [
    'UP' => 'ptz_control', 'DOWN' => 'ptz_control', 'LEFT' => 'ptz_control',
    'RIGHT' => 'ptz_control', 'STOP' => 'ptz_control', 'ZOOM_IN' => 'ptz_control',
    'ZOOM_OUT' => 'ptz_control', 'SNAPSHOT' => 'snapshot', 'STATUS' => 'view_live',
    'PING' => 'view_live', 'RECORD_START' => 'recording_start',
    'RECORD_STOP' => 'recording_stop', 'REBOOT' => 'reboot',
//    'CAPTURE_ALL' => 'snapshot'
];

$requiredPerm = $commandPermissions[$command] ?? 'view_live';
if (!in_array($requiredPerm, $allowedCommands)) {
    auditLog($_SESSION['username'], $command, $cameraId, 'DENIED', 'Insufficient permissions');
    echo json_encode(['success' => false, 'error' => 'Permission denied for this command']);
    exit;
}

// Execute command
$result = executeCameraCommand($camera, $command);
auditLog($_SESSION['username'], $command, $cameraId, $result['success'] ? 'SUCCESS' : 'FAILED', $result['output'] ?? '');

echo json_encode($result);

// ============================================
// COMMAND EXECUTION FUNCTIONS
// ============================================

function executeCameraCommand($camera, $command) {
    switch ($command) {
        case 'STATUS':
        case 'PING':
            return checkCameraStatus($camera);
        case 'SNAPSHOT':
            return captureHikvisionSnapshot($camera);
//       case 'CAPTURE_ALL':  // ADD THIS NEW CASE
//          return captureAllSnapshots();
        case 'UP':
        case 'DOWN':
        case 'LEFT':
        case 'RIGHT':
            return sendHikvisionPTZ($camera, $command);
        case 'STOP':
            return stopHikvisionPTZ($camera);
        default:
            return ['success' => false, 'error' => "Unknown command: $command"];
    }
}

function checkCameraStatus($camera) {
    $ip = $camera['ip'];
    $port = $camera['port'];
    $username = $camera['username'];
    $password = $camera['password'];
    
    // Try snapshot URL to verify camera is working
    $testUrl = "http://$ip:$port/ISAPI/Streaming/channels/101/picture";
    $ch = curl_init($testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $downloadSize = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
    curl_close($ch);
    
    if ($httpCode == 200) {
        return ['success' => true, 'status' => 'online', 'details' => "HTTP $httpCode"];
    }
    
    return ['success' => true, 'status' => 'offline', 'http_code' => $httpCode, 'error' => "No response on port $port"];
}

function captureHikvisionSnapshot($camera) {
    $ip = $camera['ip'];
    $port = $camera['port'];
    $username = $camera['username'];
    $password = $camera['password'];
    
    // Working snapshot URLs from test results
    $snapshotUrls = [
        "http://$ip:$port/ISAPI/Streaming/channels/101/picture",  // Main stream - WORKING
        "http://$ip:$port/ISAPI/Streaming/channels/102/picture",  // Sub stream - WORKING
        "http://$ip:$port/ISAPI/Streaming/channels/2/picture",    // Alternative - WORKING
        "http://$ip:$port/Streaming/Channels/101/picture"         // Alternative - WORKING
    ];
    
    $snapshotDir = __DIR__ . '/snapshots/';
    if (!file_exists($snapshotDir)) {
        mkdir($snapshotDir, 0755, true);
    }
    
    foreach ($snapshotUrls as $snapshotUrl) {
        $ch = curl_init($snapshotUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]);
        
        $imageData = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $downloadSize = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
        curl_close($ch);
        
        // Check if we got a valid JPEG image
        $isValidImage = ($httpCode == 200 && $imageData && strlen($imageData) > 5000);
        
        if ($isValidImage) {
            $filename = 'snapshots/' . $camera['id'] . '_' . date('Ymd_His') . '.jpg';
            file_put_contents($filename, $imageData);
            
            return [
                'success' => true,
                'image_url' => $filename,
                'size' => strlen($imageData),
                'output' => 'Snapshot captured (' . strlen($imageData) . ' bytes)'
            ];
        }
    }
    
    return ['success' => false, 'error' => 'Could not capture snapshot - check camera connection'];
}

function sendHikvisionPTZ($camera, $direction) {
    $ip = $camera['ip'];
    $port = $camera['port'];
    $username = $camera['username'];
    $password = $camera['password'];
    
    $ptzMap = [
        'UP' => ['pan' => 0, 'tilt' => 50],
        'DOWN' => ['pan' => 0, 'tilt' => -50],
        'LEFT' => ['pan' => -50, 'tilt' => 0],
        'RIGHT' => ['pan' => 50, 'tilt' => 0]
    ];
    
    if (!isset($ptzMap[$direction])) {
        return ['success' => false, 'error' => 'Invalid PTZ direction'];
    }
    
    $move = $ptzMap[$direction];
    
    $url = "http://$ip:$port/ISAPI/PTZCtrl/channels/1/continuous";
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>
    <PTZData>
        <pan>' . $move['pan'] . '</pan>
        <panSpeed>50</panSpeed>
        <tilt>' . $move['tilt'] . '</tilt>
        <tiltSpeed>50</tiltSpeed>
    </PTZData>';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xml);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_USERPWD, "{$camera['username']}:{$camera['password']}");
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/xml']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 || $httpCode == 204) {
        return ['success' => true, 'output' => "PTZ $direction command sent"];
    }
    
    return ['success' => false, 'error' => "PTZ failed: HTTP $httpCode"];
}

function stopHikvisionPTZ($camera) {
    $ip = $camera['ip'];
    $port = $camera['port'];
    $username = $camera['username'];
    $password = $camera['password'];
    
    $url = "http://$ip:$port/ISAPI/PTZCtrl/channels/1/stop";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 || $httpCode == 204) {
        return ['success' => true, 'output' => 'PTZ stopped'];
    }
    
    return ['success' => false, 'error' => "Stop failed: HTTP $httpCode"];
}

// ============================================
// BULK SNAPSHOT FUNCTION - Capture all cameras at once
// ============================================

/* function captureAllSnapshots() {
    $cameras = getAllCameras();
    $results = [];
    $snapshotDir = __DIR__ . '/snapshots/';
    
    if (!file_exists($snapshotDir)) {
        mkdir($snapshotDir, 0755, true);
    }
    
    $timestamp = date('Ymd_His');
    $batchId = uniqid();
    
    foreach ($cameras as $cameraId => $camera) {
        // Skip disabled cameras
        if (!($camera['enabled'] ?? true)) {
            $results[$cameraId] = ['success' => false, 'error' => 'Camera disabled'];
            continue;
        }
        
        $ip = $camera['ip'];
        $port = $camera['port'];
        $username = $camera['username'];
        $password = $camera['password'];
        
        // Try multiple snapshot URLs
        $snapshotUrls = [
            "http://$ip:$port/ISAPI/Streaming/channels/101/picture",
            "http://$ip:$port/ISAPI/Streaming/channels/102/picture",
            "http://$ip:$port/ISAPI/Streaming/channels/2/picture",
            "http://$ip:$port/Streaming/Channels/101/picture"
        ];
        
        $captured = false;
        
        foreach ($snapshotUrls as $snapshotUrl) {
            $ch = curl_init($snapshotUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
            curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]);
            
            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode == 200 && $imageData && strlen($imageData) > 5000) {
                $filename = "snapshots/batch_{$batchId}_{$cameraId}_{$timestamp}.jpg";
                file_put_contents($filename, $imageData);
                $results[$cameraId] = [
                    'success' => true,
                    'image_url' => $filename,
                    'size' => strlen($imageData),
                    'name' => $camera['name']
                ];
                $captured = true;
                break;
            }
        }
        
        if (!$captured) {
            $results[$cameraId] = [
                'success' => false,
                'error' => 'Could not capture snapshot',
                'name' => $camera['name']
            ];
        }
    }
    
    // Create a summary report
    $successCount = 0;
    $failCount = 0;
    foreach ($results as $result) {
        if ($result['success']) {
            $successCount++;
        } else {
            $failCount++;
        }
    }
    
    // Save batch info
    $batchInfo = [
        'batch_id' => $batchId,
        'timestamp' => date('Y-m-d H:i:s'),
        'total' => count($cameras),
        'success' => $successCount,
        'failed' => $failCount,
        'results' => $results
    ];
    
    file_put_contents($snapshotDir . "batch_{$batchId}_info.json", json_encode($batchInfo, JSON_PRETTY_PRINT));
    
    return [
        'success' => true,
        'batch_id' => $batchId,
        'total' => count($cameras),
        'success_count' => $successCount,
        'failed_count' => $failCount,
        'results' => $results,
        'message' => "Captured $successCount out of " . count($cameras) . " cameras"
    ];
} */

// Add this to handle the 'capture_all' command in your existing switch statement
// Find the executeCameraCommand function and add this case:
/*
case 'CAPTURE_ALL':
    return captureAllSnapshots();
*/
?>