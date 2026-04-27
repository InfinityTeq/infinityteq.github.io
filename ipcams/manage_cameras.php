<?php
// manage_cameras.php - Add, edit, delete cameras
session_start();
require_once 'config.php';

// Check authentication and admin role
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header('Location: login.php');
    exit;
}

$userRole = $_SESSION['role'] ?? 'viewer';
if (!in_array('manage_cameras', $role_permissions[$userRole] ?? [])) {
    header('Location: index.php');
    exit;
}

$message = '';
$messageType = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add':
                $cameraData = [
                    'name' => $_POST['name'],
                    'ip' => $_POST['ip'],
                    'port' => intval($_POST['port']),
                    'username' => $_POST['username'],
                    'password' => $_POST['password'],
                    'type' => $_POST['type'],
                    'protocol' => $_POST['protocol'],
                    'location' => $_POST['location'],
                    'department' => $_POST['department'],
                    'enabled' => isset($_POST['enabled'])
                ];
                
                // Test connection before adding
                $testResult = testCameraConnection($cameraData['ip'], $cameraData['port'], $cameraData['username'], $cameraData['password']);
                
                if ($testResult) {
                    $result = addCamera($cameraData);
                    if ($result['success']) {
                        $message = "Camera added successfully!";
                        $messageType = "success";
                        auditLog($_SESSION['username'], 'ADD_CAMERA', $cameraData['name'], 'SUCCESS', "Camera added");
                    } else {
                        $message = "Failed to add camera: " . ($result['error'] ?? 'Unknown error');
                        $messageType = "error";
                    }
                } else {
                    $message = "Camera connection test failed. Please check IP, port, and credentials.";
                    $messageType = "error";
                }
                break;
                
            case 'edit':
                $cameraId = $_POST['camera_id'];
                $cameraData = [
                    'name' => $_POST['name'],
                    'ip' => $_POST['ip'],
                    'port' => intval($_POST['port']),
                    'username' => $_POST['username'],
                    'password' => $_POST['password'],
                    'type' => $_POST['type'],
                    'protocol' => $_POST['protocol'],
                    'location' => $_POST['location'],
                    'department' => $_POST['department'],
                    'enabled' => isset($_POST['enabled'])
                ];
                
                $result = updateCamera($cameraId, $cameraData);
                if ($result['success']) {
                    $message = "Camera updated successfully!";
                    $messageType = "success";
                    auditLog($_SESSION['username'], 'EDIT_CAMERA', $cameraData['name'], 'SUCCESS', "Camera updated");
                } else {
                    $message = "Failed to update camera: " . ($result['error'] ?? 'Unknown error');
                    $messageType = "error";
                }
                break;
                
            case 'delete':
                $cameraId = $_POST['camera_id'];
                $camera = getCamera($cameraId);
                $result = deleteCamera($cameraId);
                if ($result['success']) {
                    $message = "Camera deleted successfully!";
                    $messageType = "success";
                    auditLog($_SESSION['username'], 'DELETE_CAMERA', $camera['name'] ?? $cameraId, 'SUCCESS', "Camera deleted");
                } else {
                    $message = "Failed to delete camera: " . ($result['error'] ?? 'Unknown error');
                    $messageType = "error";
                }
                break;
                
            case 'test':
                $ip = $_POST['ip'];
                $port = intval($_POST['port']);
                $username = $_POST['username'];
                $password = $_POST['password'];
                
                $result = testCameraConnection($ip, $port, $username, $password);
                header('Content-Type: application/json');
                echo json_encode(['success' => $result]);
                exit;
        }
    }
}

// Refresh cameras list
$cameras = getAllCameras();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Cameras - CCTV System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; }
        .header { background: linear-gradient(135deg, #16213e 0%, #0f3460 100%); padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .logo h1 { font-size: 22px; color: #00d4ff; }
        .user-info { display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 30px; }
        .back-btn { background: #00d4ff; color: #16213e; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; text-decoration: none; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .card { background: #16213e; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #2c3e66; }
        .card h2 { color: #00d4ff; margin-bottom: 15px; font-size: 18px; }
        .form-group { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 15px; }
        .form-field { flex: 1; min-width: 200px; }
        .form-field label { display: block; margin-bottom: 5px; font-size: 12px; color: #8899aa; }
        .form-field input, .form-field select { width: 100%; padding: 10px; background: #0f0f1a; border: 1px solid #2c3e66; border-radius: 6px; color: #eee; }
        button { background: #0f3460; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
        button:hover { background: #1a4a80; }
        button.success { background: #27ae60; }
        button.danger { background: #e74c3c; }
        button.warning { background: #f39c12; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #2c3e66; }
        th { background: #0f3460; color: #00d4ff; }
        tr:hover { background: #0f0f1a; }
        .status-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; }
        .status-online { background: #27ae60; }
        .status-offline { background: #e74c3c; }
        .message { padding: 12px; border-radius: 8px; margin-bottom: 20px; }
        .message.success { background: rgba(39,174,96,0.2); border-left: 3px solid #27ae60; color: #27ae60; }
        .message.error { background: rgba(231,76,60,0.2); border-left: 3px solid #e74c3c; color: #e74c3c; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #16213e; border-radius: 12px; padding: 25px; max-width: 500px; width: 90%; }
        .button-group { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
        @media (max-width: 768px) { .form-field { min-width: 100%; } table { display: block; overflow-x: auto; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <h1>🎥 Camera Management</h1>
        </div>
        <div class="user-info">
            <span>👤 <?php echo htmlspecialchars($_SESSION['username']); ?></span>
            <a href="index.php" class="back-btn">← Back to Dashboard</a>
        </div>
    </div>
    
    <div class="container">
        <?php if ($message): ?>
            <div class="message <?php echo $messageType; ?>"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <!-- Add Camera Form -->
        <div class="card">
            <h2>➕ Add New Camera</h2>
            <form method="POST" id="addCameraForm">
                <input type="hidden" name="action" value="add">
                <div class="form-group">
                    <div class="form-field">
                        <label>Camera Name *</label>
                        <input type="text" name="name" required placeholder="e.g., Main Entrance">
                    </div>
                    <div class="form-field">
                        <label>IP Address *</label>
                        <input type="text" name="ip" required placeholder="192.168.1.100">
                    </div>
                    <div class="form-field">
                        <label>Port</label>
                        <input type="number" name="port" value="80">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>Username</label>
                        <input type="text" name="username" value="admin">
                    </div>
                    <div class="form-field">
                        <label>Password</label>
                        <input type="password" name="password" value="12345abc">
                    </div>
                    <div class="form-field">
                        <label>Location</label>
                        <input type="text" name="location" placeholder="e.g., Front Gate">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>Camera Type</label>
                        <select name="type">
                            <option value="HIKVISION">Hikvision</option>
                            <option value="DAHUA">Dahua</option>
                            <option value="AXIS">Axis</option>
                            <option value="ONVIF">ONVIF</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Protocol</label>
                        <select name="protocol">
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Department</label>
                        <input type="text" name="department" placeholder="e.g., Security">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>
                            <input type="checkbox" name="enabled" checked> Enable Camera
                        </label>
                    </div>
                    <div class="form-field">
                        <button type="button" onclick="testConnection('add')">🔍 Test Connection</button>
                        <button type="submit" class="success">➕ Add Camera</button>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- Camera List -->
        <div class="card">
            <h2>📷 Camera List (<?php echo count($cameras); ?> cameras)</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>IP:Port</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cameras as $id => $cam): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($id); ?></td>
                        <td><?php echo htmlspecialchars($cam['name']); ?></td>
                        <td><?php echo htmlspecialchars($cam['ip'] . ':' . $cam['port']); ?></td>
                        <td><?php echo htmlspecialchars($cam['location'] ?? 'N/A'); ?></td>
                        <td>
                            <span class="status-badge status-online" id="status_<?php echo $id; ?>">● Online</span>
                        </td>
                        <td>
                            <button onclick="editCamera('<?php echo $id; ?>')" class="warning">✏️ Edit</button>
                            <button onclick="deleteCamera('<?php echo $id; ?>')" class="danger">🗑️ Delete</button>
                            <button onclick="testSingleCamera('<?php echo $id; ?>')">🔍 Test</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Edit Modal -->
    <div id="editModal" class="modal">
        <div class="modal-content">
            <h2>✏️ Edit Camera</h2>
            <form method="POST" id="editCameraForm">
                <input type="hidden" name="action" value="edit">
                <input type="hidden" name="camera_id" id="edit_camera_id">
                <div class="form-group">
                    <div class="form-field">
                        <label>Camera Name</label>
                        <input type="text" name="name" id="edit_name" required>
                    </div>
                    <div class="form-field">
                        <label>IP Address</label>
                        <input type="text" name="ip" id="edit_ip" required>
                    </div>
                    <div class="form-field">
                        <label>Port</label>
                        <input type="number" name="port" id="edit_port">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>Username</label>
                        <input type="text" name="username" id="edit_username">
                    </div>
                    <div class="form-field">
                        <label>Password</label>
                        <input type="password" name="password" id="edit_password">
                    </div>
                    <div class="form-field">
                        <label>Location</label>
                        <input type="text" name="location" id="edit_location">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>Camera Type</label>
                        <select name="type" id="edit_type">
                            <option value="HIKVISION">Hikvision</option>
                            <option value="DAHUA">Dahua</option>
                            <option value="AXIS">Axis</option>
                            <option value="ONVIF">ONVIF</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Protocol</label>
                        <select name="protocol" id="edit_protocol">
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Department</label>
                        <input type="text" name="department" id="edit_department">
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-field">
                        <label>
                            <input type="checkbox" name="enabled" id="edit_enabled"> Enable Camera
                        </label>
                    </div>
                </div>
                <div class="button-group">
                    <button type="button" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="success">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        const cameras = <?php echo json_encode($cameras); ?>;
        
        // Test all camera statuses on load
        document.addEventListener('DOMContentLoaded', function() {
            testAllCameras();
            setInterval(testAllCameras, 60000);
        });
        
        async function testAllCameras() {
            for (const [id, camera] of Object.entries(cameras)) {
                if (camera.enabled) {
                    const status = await testCamera(id, camera.ip, camera.port, camera.username, camera.password);
                    const statusSpan = document.getElementById('status_' + id);
                    if (statusSpan) {
                        statusSpan.innerHTML = status ? '● Online' : '○ Offline';
                        statusSpan.className = 'status-badge ' + (status ? 'status-online' : 'status-offline');
                    }
                }
            }
        }
        
        async function testCamera(id, ip, port, username, password) {
            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        camera_id: id,
                        command: 'status',
                        test_data: { ip, port, username, password }
                    })
                });
                const data = await response.json();
                return data.status === 'online';
            } catch(e) {
                return false;
            }
        }
        
        async function testSingleCamera(cameraId) {
            const camera = cameras[cameraId];
            if (!camera) return;
            
            const result = await testCamera(cameraId, camera.ip, camera.port, camera.username, camera.password);
            alert(result ? '✅ Camera is ONLINE' : '❌ Camera is OFFLINE');
        }
        
        async function testConnection(formType) {
            let ip, port, username, password;
            
            if (formType === 'add') {
                ip = document.querySelector('#addCameraForm input[name="ip"]').value;
                port = document.querySelector('#addCameraForm input[name="port"]').value;
                username = document.querySelector('#addCameraForm input[name="username"]').value;
                password = document.querySelector('#addCameraForm input[name="password"]').value;
            } else {
                ip = document.querySelector('#edit_ip').value;
                port = document.querySelector('#edit_port').value;
                username = document.querySelector('#edit_username').value;
                password = document.querySelector('#edit_password').value;
            }
            
            try {
                const response = await fetch('manage_cameras.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=test&ip=${encodeURIComponent(ip)}&port=${port}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                const data = await response.json();
                alert(data.success ? '✅ Connection successful!' : '❌ Connection failed. Check credentials.');
            } catch(e) {
                alert('❌ Test failed: ' + e.message);
            }
        }
        
        function editCamera(cameraId) {
            const camera = cameras[cameraId];
            if (!camera) return;
            
            document.getElementById('edit_camera_id').value = cameraId;
            document.getElementById('edit_name').value = camera.name;
            document.getElementById('edit_ip').value = camera.ip;
            document.getElementById('edit_port').value = camera.port;
            document.getElementById('edit_username').value = camera.username;
            document.getElementById('edit_password').value = camera.password;
            document.getElementById('edit_location').value = camera.location || '';
            document.getElementById('edit_type').value = camera.type || 'HIKVISION';
            document.getElementById('edit_protocol').value = camera.protocol || 'http';
            document.getElementById('edit_department').value = camera.department || '';
            document.getElementById('edit_enabled').checked = camera.enabled !== false;
            
            document.getElementById('editModal').style.display = 'flex';
        }
        
        function deleteCamera(cameraId) {
            if (confirm('Are you sure you want to delete this camera?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="camera_id" value="${cameraId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }
        
        function closeModal() {
            document.getElementById('editModal').style.display = 'none';
        }
    </script>
</body>
</html>