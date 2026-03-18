<?php
$dir = dirname($_SERVER['DOCUMENT_ROOT']) . '/downloads/GridFinder/';
$files = glob($dir . '*.zip');
if (!empty($files)) {
    $file = $files[0];
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($file) . '"');
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}
http_response_code(404);
echo 'No file found';
