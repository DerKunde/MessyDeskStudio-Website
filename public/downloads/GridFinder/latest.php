<?php
$files = glob(__DIR__ . '/*.zip');
if (!empty($files)) {
    $file = basename($files[0]);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $file . '"');
    header('Content-Length: ' . filesize($files[0]));
    readfile($files[0]);
    exit;
}
http_response_code(404);
echo 'No file found';
