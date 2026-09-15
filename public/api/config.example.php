<?php
/**
 * RIVO - contact endpoint configuration.
 *
 * Copy this file to the server and fill it in. It is not in the repository, so
 * the credentials live only on the host. Two places work, the first is safer:
 *
 *   ~/rivo-config.php          above public_html - not reachable over http at all
 *   ~/public_html/api/config.php   inside, denied by api/.htaccess
 *
 *   cp config.example.php ../../rivo-config.php && chmod 600 ../../rivo-config.php
 *
 * Every value can also come from an environment variable; the file wins when it
 * sets a non-empty value.
 */

return [
    /* MySQL database created in hPanel -> Databases -> MySQL */
    'db' => [
        'host' => getenv('RIVO_DB_HOST') ?: 'localhost',
        'port' => (int) (getenv('RIVO_DB_PORT') ?: 3306),
        'name' => getenv('RIVO_DB_NAME') ?: '',   // e.g. u123456789_rivo
        'user' => getenv('RIVO_DB_USER') ?: '',   // e.g. u123456789_rivo
        'pass' => getenv('RIVO_DB_PASS') ?: '',
        'table' => 'contact_messages',
    ],

    'mail' => [
        /* where submissions land; several addresses allowed */
        'to' => ['hello@rivomade.com'],

        /* the envelope sender must be a mailbox on the site's own domain, or the
           message fails SPF/DKIM and is filed as spam. Never the visitor's address:
           the visitor rides along as Reply-To, so "reply" in the mail client works.
           Sender and recipient are the same mailbox here, by decision. */
        'from' => getenv('RIVO_MAIL_FROM') ?: 'hello@rivomade.com',
        'from_name' => 'RIVO website',
        'subject_prefix' => 'RIVO contact',

        /* 'smtp' (authenticated, recommended) or 'mail' (the host's local PHP mail()) */
        'transport' => getenv('RIVO_MAIL_TRANSPORT') ?: 'smtp',

        'smtp' => [
            'host' => getenv('RIVO_SMTP_HOST') ?: 'smtp.hostinger.com',
            'port' => (int) (getenv('RIVO_SMTP_PORT') ?: 465),
            'secure' => getenv('RIVO_SMTP_SECURE') ?: 'ssl', // 'ssl' on 465, 'tls' (STARTTLS) on 587
            'user' => getenv('RIVO_SMTP_USER') ?: 'hello@rivomade.com',
            'pass' => getenv('RIVO_SMTP_PASS') ?: '',
            'timeout' => 15,
        ],
    ],

    'security' => [
        /* the site's own origins; a POST from anywhere else is refused */
        'allowed_origins' => [
            'https://rivomade.com',
            'https://www.rivomade.com',
        ],
        'min_seconds' => 3,     // a form filled faster than this is a bot
        'max_age_hours' => 12,  // ... or from a page left open longer than this
        'max_per_hour' => 5,    // submissions accepted from one address per hour
    ],

    /* Error log. Leave this line out entirely for the default,
       public_html/../rivo-logs/contact.log, which is outside the web root and so
       can never be fetched. Give an ABSOLUTE path to put it elsewhere; '' turns
       the file log off and falls back to the PHP error log.
       Do not build the path from __DIR__ here - this file may live above
       public_html, where __DIR__ is a different place entirely. */
    // 'log' => '/home/uXXXXXXXX/rivo-logs/contact.log',
];
