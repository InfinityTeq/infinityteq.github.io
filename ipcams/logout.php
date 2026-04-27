<?php
// logout.php - User logout
session_start();
require_once 'config.php';

if (isset($_SESSION['username'])) {
    auditLog($_SESSION['username'], 'LOGOUT', 'system', 'SUCCESS', 'User logged out');
}

session_destroy();
header('Location: login.php');
exit;
?>