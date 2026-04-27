<?php
// index.php - Main CCTV Dashboard with dynamic cameras
session_start();
require_once 'config.php';

// Check authentication
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header('Location: login.php');
    exit;
}

$userRole = $_SESSION['role'] ?? 'viewer';
$username = $_SESSION['username'] ?? 'User';
$allowedCommands = $role_permissions[$userRole] ?? $role_permissions['viewer'];

// Get cameras dynamically from JSON file
$cameras = getAllCameras();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>CCTV Management System - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; }
        .header { background: linear-gradient(135deg, #16213e 0%, #0f3460 100%); padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; border-bottom: 1px solid #2c3e66; }
        .logo h1 { font-size: 22px; color: #00d4ff; }
        .logo p { font-size: 12px; color: #8899aa; }
        .user-info { display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 30px; }
        .role-badge { background: #00d4ff; color: #16213e; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; font-size: 13px; }
        .logout-btn:hover { background: #c0392b; }
        .stats-bar { display: flex; gap: 20px; padding: 15px 25px; background: #0f0f1a; flex-wrap: wrap; align-items: center; }
        .stat { background: #16213e; padding: 8px 15px; border-radius: 8px; font-size: 13px; }
        .stat span { color: #00d4ff; font-weight: bold; font-size: 18px; margin-right: 5px; }
        .refresh-all { background: #00d4ff; color: #16213e; border: none; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-left: auto; }
        .refresh-all:hover { background: #00b8e6; }
        .manage-btn { background: #9b59b6; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; }
        .manage-btn:hover { background: #8e44ad; }
        .container { padding: 20px; }
        .camera-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
        .camera-card { background: #16213e; border-radius: 12px; overflow: hidden; border: 1px solid #2c3e66; transition: transform 0.2s; }
        .camera-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .camera-header { background: #0f3460; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; }
        .camera-title { font-weight: bold; font-size: 15px; }
        .camera-location { font-size: 11px; color: #8899aa; margin-top: 3px; }
        .status { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: bold; }
        .status.online { background: #27ae60; color: white; }
        .status.offline { background: #e74c3c; color: white; }
        .status.checking { background: #f39c12; color: white; }
        .camera-preview { background: #0a0a15; height: 220px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: pointer; }
        .camera-preview img { width: 100%; height: 100%; object-fit: cover; }
        .placeholder { text-align: center; color: #666; font-size: 14px; }
        .placeholder .icon { font-size: 48px; margin-bottom: 10px; }
        .refresh-preview { position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 5px; font-size: 10px; cursor: pointer; }
        .camera-controls { padding: 15px; }
        .control-group { margin-bottom: 15px; }
        .control-group label { display: block; font-size: 11px; color: #8899aa; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        button { background: #0f3460; border: none; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin: 2px; transition: background 0.2s; }
        button:hover { background: #1a4a80; }
        .ptz-controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 180px; }
        .ptz-controls button { padding: 10px; font-size: 16px; background: #1a4a80; }
        .command-output { background: #0a0a15; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 10px; margin-top: 10px; max-height: 80px; overflow-y: auto; color: #00d4ff; }
        .disabled-camera { opacity: 0.5; filter: grayscale(0.3); }
        @media (max-width: 768px) { .camera-grid { grid-template-columns: 1fr; } .stats-bar { flex-direction: column; } .header { flex-direction: column; text-align: center; } .refresh-all { margin-left: 0; } }
/*        .capture-all-btn {
    background: #e67e22;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
}
.capture-all-btn:hover {
    background: #d35400;
}
.spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
} */   
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <h1>🎥 CCTV Management System</h1>
            <p>Workplace Security Camera Control</p>
        </div>
        <div class="user-info">
            <span>👤 <?php echo htmlspecialchars($username); ?></span>
            <span class="role-badge"><?php echo strtoupper($userRole); ?></span>
            <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
    </div>
    
    <div class="stats-bar" id="statsBar">
        <div class="stat">📷 Total: <span id="totalCameras">0</span></div>
        <div class="stat">🟢 Online: <span id="onlineCount">0</span></div>
        <div class="stat">🔴 Offline: <span id="offlineCount">0</span></div>
        <button class="refresh-all" onclick="refreshAllStatus()">🔄 Refresh All</button>
        <button class="refresh-all" onclick="refreshAllSnapshots()">📸 Refresh All Snapshots</button>
    <!-- <button class="capture-all-btn" onclick="captureAllSnapshots()">🎬 Capture ALL Cameras</button> -->
        <?php if (in_array('manage_cameras', $allowedCommands)): ?>
            <a href="manage_cameras.php" class="manage-btn">⚙️ Manage Cameras</a>
        <?php endif; ?>
    </div>
    
    <div class="container">
        <div class="camera-grid" id="cameraGrid">
            <?php foreach ($cameras as $camId => $cam): 
                if (!($cam['enabled'] ?? true)) continue;
            ?>
            <div class="camera-card <?php echo ($cam['enabled'] ?? true) ? '' : 'disabled-camera'; ?>" data-camera-id="<?php echo $camId; ?>">
                <div class="camera-header">
                    <div>
                        <div class="camera-title"><?php echo htmlspecialchars($cam['name']); ?></div>
                        <div class="camera-location">📍 <?php echo htmlspecialchars($cam['location'] ?? 'Unknown'); ?> | <?php echo htmlspecialchars($cam['ip']); ?>:<?php echo $cam['port']; ?></div>
                    </div>
                    <span class="status checking" id="status_<?php echo $camId; ?>">● Checking</span>
                </div>
                <div class="camera-preview" id="preview_<?php echo $camId; ?>" onclick="captureSnapshot('<?php echo $camId; ?>')">
                    <div class="placeholder">
                        <div class="icon">📷</div>
                        <div>Click to capture snapshot</div>
                    </div>
                    <div class="refresh-preview" onclick="event.stopPropagation(); captureSnapshot('<?php echo $camId; ?>')">🔄 Refresh</div>
                </div>
                <div class="camera-controls">
                    <div class="control-group">
                        <label>Quick Actions</label>
                        <button onclick="captureSnapshot('<?php echo $camId; ?>')">📸 Snapshot</button>
                        <button onclick="checkStatus('<?php echo $camId; ?>')">🔍 Check Status</button>
                        <?php if (in_array('recording_start', $allowedCommands)): ?>
                        <button onclick="sendCommand('<?php echo $camId; ?>', 'record_start')">🔴 Record</button>
                        <button onclick="sendCommand('<?php echo $camId; ?>', 'record_stop')">⏹️ Stop</button>
                        <?php endif; ?>
                    </div>
                    
                    <?php if (in_array('ptz_control', $allowedCommands)): ?>
                    <div class="control-group">
                        <label>PTZ Controls</label>
                        <div class="ptz-controls">
                            <button></button>
                            <button onclick="sendCommand('<?php echo $camId; ?>', 'UP')">▲</button>
                            <button></button>
                            <button onclick="sendCommand('<?php echo $camId; ?>', 'LEFT')">◄</button>
                            <button onclick="sendCommand('<?php echo $camId; ?>', 'STOP')">●</button>
                            <button onclick="sendCommand('<?php echo $camId; ?>', 'RIGHT')">►</button>
                            <button></button>
                            <button onclick="sendCommand('<?php echo $camId; ?>', 'DOWN')">▼</button>
                            <button></button>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <div class="command-output" id="output_<?php echo $camId; ?>">
                        Ready - Click Snapshot to capture image
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    
    <script>
        // Get camera IDs dynamically from PHP
        let cameras = <?php echo json_encode(array_keys(array_filter($cameras, function($c) { return $c['enabled'] ?? true; }))); ?>;
        let cameraDetails = <?php echo json_encode($cameras); ?>;
        
        document.addEventListener('DOMContentLoaded', function() {
            updateStats();
            checkAllStatus();
            // Auto-refresh snapshots every 30 seconds
            setInterval(function() {
                if (document.visibilityState === 'visible') {
                    refreshAllSnapshots();
                }
            }, 30000);
            // Check status every minute
            setInterval(checkAllStatus, 60000);
        });
        
        function updateStats() {
            document.getElementById('totalCameras').innerText = cameras.length;
        }
        
        async function checkAllStatus() {
            let online = 0;
            let offline = 0;
            
            for (const camId of cameras) {
                const status = await getStatus(camId);
                if (status === 'online') online++;
                else offline++;
                
                const statusSpan = document.getElementById('status_' + camId);
                if (statusSpan) {
                    statusSpan.innerHTML = status === 'online' ? '● Online' : '○ Offline';
                    statusSpan.className = 'status ' + status;
                }
            }
            
            document.getElementById('onlineCount').innerText = online;
            document.getElementById('offlineCount').innerText = offline;
        }
        
        async function getStatus(cameraId) {
            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camera_id: cameraId, command: 'status' })
                });
                const data = await response.json();
                return data.status || 'offline';
            } catch(e) {
                return 'offline';
            }
        }
        
        function refreshAllStatus() { 
            checkAllStatus(); 
        }
        
        function refreshAllSnapshots() {
            for (const camId of cameras) {
                // Only refresh if the camera is visible and has a preview that's showing
                const previewDiv = document.getElementById('preview_' + camId);
                if (previewDiv && previewDiv.querySelector('img')) {
                    captureSnapshot(camId, true);
                }
            }
        }
        
        async function captureSnapshot(cameraId, silent = false) {
            const outputDiv = document.getElementById('output_' + cameraId);
            const previewDiv = document.getElementById('preview_' + cameraId);
            
            if (!silent) {
                outputDiv.innerHTML = '⏳ Capturing snapshot...';
            }
            
            if (previewDiv && !previewDiv.querySelector('img')) {
                previewDiv.innerHTML = '<div class="placeholder"><div class="icon">📷</div><div>Capturing...</div></div>';
            }
            
            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camera_id: cameraId, command: 'snapshot' })
                });
                
                const data = await response.json();
                
                if (data.success && data.image_url) {
                    const timestamp = new Date().getTime();
                    if (previewDiv) {
                        previewDiv.innerHTML = `<img src="${data.image_url}?t=${timestamp}" alt="Snapshot" onclick="event.stopPropagation(); captureSnapshot('${cameraId}')"><div class="refresh-preview" onclick="event.stopPropagation(); captureSnapshot('${cameraId}')">🔄 Refresh</div>`;
                    }
                    if (!silent) {
                        outputDiv.innerHTML = '✅ Snapshot captured successfully! (' + (data.size || 'unknown') + ' bytes)';
                    }
                } else {
                    if (previewDiv) {
                        previewDiv.innerHTML = `<div class="placeholder"><div class="icon">❌</div><div>Failed: ${data.error || 'Unknown error'}</div></div>`;
                    }
                    if (!silent) {
                        outputDiv.innerHTML = '❌ Snapshot failed: ' + (data.error || 'Unknown error');
                    }
                }
            } catch(error) {
                if (previewDiv) {
                    previewDiv.innerHTML = '<div class="placeholder"><div class="icon">❌</div><div>Network error</div></div>';
                }
                if (!silent) {
                    outputDiv.innerHTML = '❌ Network error: ' + error.message;
                }
            }
        }
        
        // async function captureAllSnapshots() {
        //     const outputDiv = document.createElement('div');
        //     outputDiv.style.position = 'fixed';
        //     outputDiv.style.top = '50%';
        //     outputDiv.style.left = '50%';
        //     outputDiv.style.transform = 'translate(-50%, -50%)';
        //     outputDiv.style.background = '#16213e';
        //     outputDiv.style.padding = '20px';
        //     outputDiv.style.borderRadius = '12px';
        //     outputDiv.style.zIndex = '9999';
        //     outputDiv.style.textAlign = 'center';
        //     outputDiv.style.minWidth = '300px';
        //     outputDiv.style.border = '1px solid #00d4ff';
        //     outputDiv.innerHTML = '<div class="icon">🎬</div><h3>Capturing All Cameras...</h3><div id="captureProgress">Preparing...</div><div class="spinner" style="margin-top:15px;">⏳</div>';
        //     document.body.appendChild(outputDiv);
            
        //     try {
        //         const response = await fetch('api.php', {
        //             method: 'POST',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({ 
        //                 camera_id: 'all', 
        //                 command: 'CAPTURE_ALL' 
        //             })
        //         });
                
        //         const data = await response.json();
                
        //         if (data.success) {
        //             outputDiv.innerHTML = `
        //                 <div class="icon">✅</div>
        //                 <h3>Capture Complete!</h3>
        //                 <p>📷 Total: ${data.total} cameras</p>
        //                 <p>🟢 Success: ${data.success_count}</p>
        //                 <p>🔴 Failed: ${data.failed_count}</p>
        //                 <button onclick="location.reload()" style="margin-top:15px; background:#00d4ff; color:#16213e;">Refresh Dashboard</button>
        //                 <button onclick="downloadBatchReport('${data.batch_id}')" style="margin-top:15px; margin-left:10px;">📄 Download Report</button>
        //             `;
                    
        //             // Update each camera preview if it exists
        //             if (data.results) {
        //                 for (const [camId, result] of Object.entries(data.results)) {
        //                     if (result.success && result.image_url) {
        //                         const previewDiv = document.getElementById('preview_' + camId);
        //                         if (previewDiv) {
        //                             const timestamp = new Date().getTime();
        //                             previewDiv.innerHTML = `<img src="${result.image_url}?t=${timestamp}" alt="Snapshot" onclick="event.stopPropagation(); captureSnapshot('${camId}')"><div class="refresh-preview" onclick="event.stopPropagation(); captureSnapshot('${camId}')">🔄 Refresh</div>`;
        //                         }
        //                     }
        //                 }
        //             }
                    
        //             setTimeout(() => {
        //                 if (outputDiv && outputDiv.parentNode) {
        //                     outputDiv.style.opacity = '0';
        //                     setTimeout(() => outputDiv.remove(), 500);
        //                 }
        //             }, 5000);
        //         } else {
        //             outputDiv.innerHTML = `<div class="icon">❌</div><h3>Capture Failed</h3><p>${data.error || 'Unknown error'}</p><button onclick="this.parentElement.remove()">Close</button>`;
        //         }
        //     } catch(error) {
        //         outputDiv.innerHTML = `<div class="icon">❌</div><h3>Network Error</h3><p>${error.message}</p><button onclick="this.parentElement.remove()">Close</button>`;
        //     }
        // }

        // function downloadBatchReport(batchId) {
        //     window.location.href = `download_batch.php?batch_id=${batchId}`;
        // }

        async function checkStatus(cameraId) {
            const outputDiv = document.getElementById('output_' + cameraId);
            outputDiv.innerHTML = '⏳ Checking status...';
            
            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camera_id: cameraId, command: 'status' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const statusSpan = document.getElementById('status_' + cameraId);
                    if (data.status === 'online') {
                        statusSpan.innerHTML = '● Online';
                        statusSpan.className = 'status online';
                        outputDiv.innerHTML = '✅ Camera is ONLINE - ' + (data.details || '');
                    } else {
                        statusSpan.innerHTML = '○ Offline';
                        statusSpan.className = 'status offline';
                        outputDiv.innerHTML = '❌ Camera is OFFLINE - ' + (data.error || 'No response');
                    }
                } else {
                    outputDiv.innerHTML = '❌ Status check failed: ' + (data.error || 'Unknown');
                }
            } catch(error) {
                outputDiv.innerHTML = '❌ Network error: ' + error.message;
            }
        }
        
        async function sendCommand(cameraId, command) {
            const outputDiv = document.getElementById('output_' + cameraId);
            outputDiv.innerHTML = '⏳ Sending: ' + command + '...';
            
            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camera_id: cameraId, command: command })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    outputDiv.innerHTML = '✅ ' + command + ': ' + (data.output || 'Success');
                } else {
                    outputDiv.innerHTML = '❌ Error: ' + (data.error || 'Unknown error');
                }
            } catch(error) {
                outputDiv.innerHTML = '❌ Network error: ' + error.message;
            }
        }
        
        function logout() {
            fetch('logout.php').then(() => { window.location.href = 'login.php'; });
        }
    </script>
</body>
</html>