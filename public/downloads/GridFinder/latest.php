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
// Debug: zeigt den Pfad und alle Dateien im Ordner
echo 'Dir: ' . $dir . '<br>';
$all = scandir($dir);
echo 'Files: ' . implode(', ', $all);
