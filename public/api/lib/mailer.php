<?php
/**
 * RIVO - mail transport.
 *
 * A small authenticated SMTP client (implicit TLS on 465, STARTTLS on 587) with
 * mail() as the fallback transport. No Composer, no vendor directory: shared
 * hosting gets one file it can read.
 *
 * Every header value is passed through rivo_header_value(), which strips CR/LF -
 * a visitor's name or address must never be able to inject a header.
 */

declare(strict_types=1);

final class RivoMailError extends RuntimeException {}

function rivo_header_value(string $value): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $value));
}

/** RFC 2047 encoded-word, so a Turkish name or an em dash survives the subject line. */
function rivo_encode_header(string $value): string
{
    $value = rivo_header_value($value);
    if (preg_match('/^[\x20-\x7E]*$/', $value)) return $value;
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function rivo_address(string $email, string $name = ''): string
{
    $email = rivo_header_value($email);
    return $name === '' ? $email : rivo_encode_header($name) . ' <' . $email . '>';
}

/**
 * Send a plain-text UTF-8 message.
 *
 * @param string[] $to
 * @throws RivoMailError
 */
function rivo_send_mail(array $config, array $to, string $subject, string $body, string $replyTo = ''): void
{
    $from = rivo_header_value((string) $config['from']);
    $fromName = (string) ($config['from_name'] ?? '');
    $to = array_values(array_filter(array_map('rivo_header_value', $to)));
    if (!$to) throw new RivoMailError('no recipient configured');

    $headers = [
        'From' => rivo_address($from, $fromName),
        'Subject' => rivo_encode_header($subject),
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'base64',
        'Date' => date(DATE_RFC2822),
        'Message-ID' => '<' . bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'localhost') . '>',
        'Auto-Submitted' => 'auto-generated',
    ];
    if ($replyTo !== '') $headers['Reply-To'] = rivo_header_value($replyTo);

    /* base64 keeps the body 7-bit clean and free of line-length surprises */
    $encoded = chunk_split(base64_encode($body), 76, "\r\n");

    if (($config['transport'] ?? 'smtp') === 'mail') {
        rivo_send_with_mail($to, $headers, $encoded, $from);
        return;
    }
    rivo_send_with_smtp($config['smtp'], $to, $headers, $encoded, $from);
}

function rivo_send_with_mail(array $to, array $headers, string $body, string $from): void
{
    $subject = $headers['Subject'];
    unset($headers['Subject']);
    $lines = [];
    foreach ($headers as $k => $v) $lines[] = $k . ': ' . $v;
    $ok = mail(implode(', ', $to), $subject, $body, implode("\r\n", $lines), '-f' . $from);
    if (!$ok) throw new RivoMailError('mail() refused the message');
}

function rivo_send_with_smtp(array $smtp, array $to, array $headers, string $body, string $from): void
{
    $host = (string) $smtp['host'];
    $port = (int) $smtp['port'];
    $secure = rivo_smtp_security((string) ($smtp['secure'] ?? ''), $port);
    $timeout = (int) ($smtp['timeout'] ?? 15);

    $context = stream_context_create(['ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
        'SNI_enabled' => true,
    ]]);
    $endpoint = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;

    $socket = @stream_socket_client($endpoint, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) throw new RivoMailError(sprintf('cannot reach %s (%d %s)', $endpoint, $errno, $errstr));
    stream_set_timeout($socket, $timeout);

    try {
        rivo_smtp_expect($socket, 220);
        $ehlo = rivo_smtp_command($socket, 'EHLO ' . (explode('@', $from)[1] ?? 'localhost'), 250);

        if ($secure === 'tls') {
            rivo_smtp_command($socket, 'STARTTLS', 220);
            $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (!@stream_socket_enable_crypto($socket, true, $crypto)) throw new RivoMailError('STARTTLS failed');
            $ehlo = rivo_smtp_command($socket, 'EHLO ' . (explode('@', $from)[1] ?? 'localhost'), 250);
        }

        $user = (string) ($smtp['user'] ?? '');
        $pass = (string) ($smtp['pass'] ?? '');
        if ($user !== '') {
            if (stripos($ehlo, 'AUTH') === false) throw new RivoMailError('server offers no AUTH');
            if (stripos($ehlo, 'PLAIN') !== false) {
                rivo_smtp_command($socket, 'AUTH PLAIN ' . base64_encode("\0" . $user . "\0" . $pass), 235);
            } else {
                rivo_smtp_command($socket, 'AUTH LOGIN', 334);
                rivo_smtp_command($socket, base64_encode($user), 334);
                rivo_smtp_command($socket, base64_encode($pass), 235);
            }
        }

        rivo_smtp_command($socket, 'MAIL FROM:<' . $from . '>', 250);
        foreach ($to as $rcpt) rivo_smtp_command($socket, 'RCPT TO:<' . $rcpt . '>', 250);
        rivo_smtp_command($socket, 'DATA', 354);

        $headers['To'] = implode(', ', $to);
        $message = '';
        foreach ($headers as $k => $v) $message .= $k . ': ' . $v . "\r\n";
        $message .= "\r\n" . $body;
        /* dot-stuffing: a line that is just "." would end DATA early */
        $message = preg_replace('/^\./m', '..', $message);

        fwrite($socket, $message . "\r\n.\r\n");
        rivo_smtp_expect($socket, 250);
        @rivo_smtp_command($socket, 'QUIT', 221);
    } finally {
        if (is_resource($socket)) fclose($socket);
    }
}

/**
 * What the 'secure' setting means, generously read.
 *
 * Hosting panels and copied PHPMailer snippets spell this a dozen ways -
 * 'ssl', 'smtps', 'SSL/TLS', 'PHPMailer::ENCRYPTION_SMTPS', 'STARTTLS'. A value
 * this function did not recognise used to fall through to a plain connection,
 * which on port 465 simply hangs until it times out. So: read the intent, and
 * when there is none, take it from the port (465 is implicit TLS, 587 STARTTLS).
 */
function rivo_smtp_security(string $value, int $port): string
{
    $value = strtolower(trim($value));
    if ($value === 'none' || $value === 'off' || $value === 'plain') return 'none';
    if (str_contains($value, 'starttls') || (str_contains($value, 'tls') && !str_contains($value, 'smtps'))) {
        /* 'ssl/tls' means implicit TLS in most panels; bare 'tls' means STARTTLS */
        if (str_contains($value, 'ssl')) return 'ssl';
        return 'tls';
    }
    if (str_contains($value, 'smtps') || str_contains($value, 'ssl')) return 'ssl';
    return $port === 587 || $port === 25 ? 'tls' : 'ssl'; // unreadable or empty: the port decides
}

function rivo_smtp_command($socket, string $command, int $expected): string
{
    fwrite($socket, $command . "\r\n");
    return rivo_smtp_expect($socket, $expected);
}

/** Read a (possibly multi-line) reply and check its code. */
function rivo_smtp_expect($socket, int $expected): string
{
    $reply = '';
    while (($line = fgets($socket, 1024)) !== false) {
        $reply .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') break; // "250-" continues, "250 " ends
    }
    if ($reply === '') throw new RivoMailError('no reply from the SMTP server');
    $code = (int) substr($reply, 0, 3);
    if ($code !== $expected) throw new RivoMailError('SMTP expected ' . $expected . ', got: ' . trim($reply));
    return $reply;
}
