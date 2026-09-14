<?php
$dir = __DIR__ . '/';
$files = glob($dir . '*.zip');
if (empty($files)) {
    $files = glob($dir . '*.ZIP');
}
if (!empty($files)) {
    $file = $files[0];
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($file) . '"');
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}
http_response_code(404);
echo 'Download aktuell nicht verfügbar.';
