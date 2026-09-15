<?php
/**
 * RIVO - contact form endpoint.
 *
 * POST /api/contact.php  ->  {"ok":true}  |  {"ok":false,"error":"...","fields":{...}}
 *
 * The submission is written to MySQL first and mailed second, so a message is
 * never lost to an SMTP hiccup (the row keeps `mail_status` = failed and the
 * error lands in the log).
 *
 * What guards it
 *   - POST only, over HTTPS, from one of the configured origins
 *   - a honeypot field and a "filled in under N seconds / page older than N hours" trap
 *   - per-address rate limit counted in the database
 *   - strict validation and length caps on every field
 *   - prepared statements for storage, CR/LF-stripped headers for mail
 *   - the response never carries a database or SMTP detail; those go to the log
 *
 * Configure by copying config.example.php to config.php (see that file).
 */

declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (function_exists('mb_internal_encoding')) mb_internal_encoding('UTF-8');

require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/mailer.php';

const RIVO_MAX = [
    'name' => 120,
    'email' => 190,
    'phone' => 60,
    'company' => 160,
    'project_type' => 60,
    'message' => 6000,
];

/* mbstring is present on every current host, but the endpoint must not fatal on
   one where it is not - these two are all the form needs. */
function rivo_strlen(string $value): int
{
    if (function_exists('mb_strlen')) return mb_strlen($value, 'UTF-8');
    $count = preg_match_all('/./us', $value);
    return $count === false ? strlen($value) : $count;
}

function rivo_cut(string $value, int $length): string
{
    if (function_exists('mb_substr')) return mb_substr($value, 0, $length, 'UTF-8');
    $cut = substr($value, 0, $length);
    while ($cut !== '' && !preg_match('//u', $cut)) $cut = substr($cut, 0, -1); // drop a split character
    return $cut;
}

/* ---------- plumbing ---------- */

/**
 * The configuration, wherever it was put. Above public_html is the safer place -
 * nothing there is reachable over http even if PHP itself ever stops running and
 * the server falls back to serving files as text. api/config.php works too and is
 * denied by api/.htaccess; the first file found wins.
 */
$config = null;
foreach ([dirname(__DIR__, 2) . '/rivo-config.php', __DIR__ . '/config.php'] as $candidate) {
    if (is_file($candidate)) { $config = require $candidate; break; }
}

function rivo_log(string $message): void
{
    global $config;
    $line = '[' . gmdate('Y-m-d H:i:s') . 'Z] ' . $message;
    /* Default: rivo-logs/ one level above public_html. Resolved from this file,
       never from the config file - the config may sit in either place, and a
       path relative to it would land somewhere unwritable. */
    $path = $config['log'] ?? null;
    if ($path === null) $path = dirname(__DIR__, 2) . '/rivo-logs/contact.log';
    if (is_string($path) && $path !== '') {
        $dir = dirname($path);
        if (!is_dir($dir)) @mkdir($dir, 0750, true);
        if (@file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX) !== false) return;
    }
    error_log('rivo/contact: ' . $message);
}

/** JSON for fetch(), a redirect back to #contact for a plain (no-JS) form post. */
function rivo_respond(int $status, array $payload): void
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $wantsJson = stripos($accept, 'application/json') !== false
        || strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');

    if (!$wantsJson) {
        $mark = ($payload['ok'] ?? false) ? 'sent' : 'error';
        header('Location: /?contact=' . $mark . '#contact', true, 303);
        exit;
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rivo_fail(int $status, string $message, array $fields = []): void
{
    $payload = ['ok' => false, 'error' => $message];
    if ($fields) $payload['fields'] = $fields;
    rivo_respond($status, $payload);
}

/* ---------- request gate ---------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    rivo_fail(405, 'Use POST.');
}

if (!$config) {
    rivo_log('config.php is missing - copy config.example.php and fill it in');
    rivo_fail(500, 'The form is not available right now. Please email hello@rivomade.com.');
}

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    || (($_SERVER['SERVER_PORT'] ?? '') === '443');
if (!$https) rivo_fail(400, 'This form requires a secure (https) connection.');

$allowed = $config['security']['allowed_origins'] ?? [];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
    $parts = parse_url($_SERVER['HTTP_REFERER']);
    if (!empty($parts['scheme']) && !empty($parts['host'])) {
        $origin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    }
}
if ($allowed && $origin !== '' && !in_array($origin, $allowed, true)) {
    rivo_log('refused a cross-origin post from ' . $origin);
    rivo_fail(403, 'This form can only be sent from the RIVO site.');
}

/* JSON body from fetch(), or a classic form post */
$raw = file_get_contents('php://input') ?: '';
$input = $_POST;
if ($raw !== '' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    if (strlen($raw) > 64 * 1024) rivo_fail(413, 'That message is too long.');
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) rivo_fail(400, 'Malformed request.');
    $input = $decoded;
}

$field = static function (string $key) use ($input): string {
    $value = $input[$key] ?? '';
    if (!is_scalar($value)) return '';
    /* normalise, drop control characters, collapse the line endings */
    $value = str_replace(["\r\n", "\r"], "\n", (string) $value);
    $value = preg_replace('/[^\P{C}\n]+/u', '', $value) ?? '';
    return trim($value);
};

/* ---------- traps ---------- */

if ($field('website') !== '' || $field('fax') !== '') {
    rivo_log('honeypot caught a post from ' . ($_SERVER['REMOTE_ADDR'] ?? '?'));
    rivo_respond(200, ['ok' => true]); // a bot is told nothing
}

$started = (int) $field('t'); // milliseconds, stamped by the browser on page load
if ($started > 0) {
    $elapsed = (time() * 1000 - $started) / 1000;
    $min = (int) ($config['security']['min_seconds'] ?? 3);
    $maxAge = (int) ($config['security']['max_age_hours'] ?? 12) * 3600;
    if ($elapsed < $min) rivo_fail(429, 'That was quick - please take a moment and send it again.');
    if ($elapsed > $maxAge) rivo_fail(408, 'This page has been open a while. Please reload and send it again.');
}

/* ---------- validation ---------- */

$errors = [];
$name = rivo_cut($field('name'), RIVO_MAX['name']);
$email = rivo_cut($field('email'), RIVO_MAX['email']);
$phone = rivo_cut($field('phone'), RIVO_MAX['phone']);
$company = rivo_cut($field('company'), RIVO_MAX['company']);
$type = rivo_cut($field('project_type'), RIVO_MAX['project_type']);
$message = rivo_cut($field('message'), RIVO_MAX['message']);

if (rivo_strlen($name) < 2) $errors['name'] = 'Please give your name.';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Please give a valid email address.';
if ($phone !== '' && !preg_match('/^[0-9+().\/\s-]{6,}$/', $phone)) $errors['phone'] = 'That phone number does not look right.';
if (rivo_strlen($message) < 10) $errors['message'] = 'Please tell us a little about the project.';

$types = ['', 'Hospitality', 'Residential', 'Retail', 'Commercial', 'Other'];
if (!in_array($type, $types, true)) $type = 'Other';

if ($errors) rivo_fail(422, 'Please check the highlighted fields.', $errors);

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ipBinary = $ip !== '' ? (@inet_pton($ip) ?: null) : null;
$userAgent = rivo_cut((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 255);
$referer = rivo_cut((string) ($_SERVER['HTTP_REFERER'] ?? ''), 255);

/* ---------- store ---------- */

$stored = null;
$db = null;
$table = null;
try {
    $table = rivo_table($config['db']);
    $db = rivo_db($config['db']);
    rivo_db_migrate($db, $table);

    $limit = (int) ($config['security']['max_per_hour'] ?? 5);
    if ($limit > 0 && rivo_db_recent_count($db, $table, $ipBinary) >= $limit) {
        rivo_fail(429, 'We already have your messages - we will be in touch shortly.');
    }

    $stored = rivo_db_insert($db, $table, [
        'name' => $name,
        'email' => $email,
        'phone' => $phone !== '' ? $phone : null,
        'company' => $company !== '' ? $company : null,
        'project_type' => $type !== '' ? $type : null,
        'message' => $message,
        'ip' => $ipBinary,
        'user_agent' => $userAgent !== '' ? $userAgent : null,
        'referer' => $referer !== '' ? $referer : null,
    ]);
} catch (Throwable $e) {
    rivo_log('database: ' . $e->getMessage()); // the mail is still worth trying
}

/* ---------- mail ---------- */

$subject = trim(($config['mail']['subject_prefix'] ?? 'RIVO contact') . ' - ' . $name . ($type !== '' ? ' / ' . $type : ''));
$body = implode("\n", array_filter([
    'A message from the RIVO website.',
    '',
    'Name:     ' . $name,
    'Email:    ' . $email,
    $phone !== '' ? 'Phone:    ' . $phone : null,
    $company !== '' ? 'Company:  ' . $company : null,
    $type !== '' ? 'Project:  ' . $type : null,
    '',
    $message,
    '',
    '--',
    'Sent ' . gmdate('Y-m-d H:i:s') . ' UTC from ' . ($referer !== '' ? $referer : 'rivomade.com'),
    $stored ? 'Record #' . $stored : 'Not stored in the database (see the log)',
    'IP ' . ($ip !== '' ? $ip : 'unknown'),
], static fn ($line) => $line !== null));

$mailed = false;
try {
    rivo_send_mail($config['mail'], (array) $config['mail']['to'], $subject, $body, $email);
    $mailed = true;
} catch (Throwable $e) {
    rivo_log('mail: ' . $e->getMessage());
}

if ($db && $table && $stored) {
    try {
        rivo_db_mark_mail($db, $table, $stored, $mailed ? 'sent' : 'failed');
    } catch (Throwable $e) {
        rivo_log('database (status): ' . $e->getMessage());
    }
}

/* Stored or mailed is a delivered message; neither is a real failure. */
if (!$stored && !$mailed) {
    rivo_fail(500, 'We could not send that just now. Please email hello@rivomade.com.');
}

rivo_respond(200, ['ok' => true, 'message' => 'Thank you - we will come back to you shortly.']);
