<?php
declare(strict_types=1);

/** Client SMTP minimal (STARTTLS / SSL / sans chiffrement), sans dépendance. */
final class Smtp
{
    /** @var resource|null */
    private $fp = null;

    public function __construct(
        private string $host,
        private int $port,
        private string $secure,
        private string $user,
        private string $pass,
        private string $helo,
        private int $timeout = 15,
    ) {}

    public function send(string $fromEmail, string $fromName, string $to, string $subject, string $body): void
    {
        $remote = ($this->secure === 'ssl' ? 'ssl://' : 'tcp://') . $this->host . ':' . $this->port;
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $this->host,
        ]]);
        $fp = @stream_socket_client($remote, $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $ctx);
        if (!$fp) throw new RuntimeException("SMTP: connexion impossible ($errstr)");
        $this->fp = $fp;
        stream_set_timeout($fp, $this->timeout);
        try {
            $this->expect([220]);
            $this->cmd("EHLO {$this->helo}", [250]);
            if ($this->secure === 'starttls') {
                $this->cmd('STARTTLS', [220]);
                if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('SMTP: échec de la négociation TLS');
                }
                $this->cmd("EHLO {$this->helo}", [250]);
            }
            if ($this->user !== '') {
                $this->cmd('AUTH LOGIN', [334]);
                $this->cmd(base64_encode($this->user), [334], true);
                $this->cmd(base64_encode($this->pass), [235], true);
            }
            $this->cmd("MAIL FROM:<$fromEmail>", [250]);
            $this->cmd("RCPT TO:<$to>", [250, 251]);
            $this->cmd('DATA', [354]);
            $this->write($this->message($fromEmail, $fromName, $to, $subject, $body) . "\r\n.\r\n");
            $this->expect([250]);
            try { $this->cmd('QUIT', [221]); } catch (Throwable $e) {}
        } finally {
            fclose($fp);
            $this->fp = null;
        }
    }

    private function message(string $fromEmail, string $fromName, string $to, string $subject, string $body): string
    {
        $domain = substr(strrchr($fromEmail, '@') ?: '@localhost', 1);
        $h = [
            'Date: ' . date('r'),
            'From: ' . mime_header($fromName) . " <$fromEmail>",
            "To: <$to>",
            'Subject: ' . mime_header($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . "@$domain>",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'Auto-Submitted: auto-generated',
        ];
        return implode("\r\n", $h) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($body), 76, "\r\n"));
    }

    private function write(string $s): void
    {
        $len = strlen($s);
        for ($w = 0; $w < $len;) {
            $n = fwrite($this->fp, substr($s, $w));
            if ($n === false || $n === 0) throw new RuntimeException('SMTP: écriture interrompue');
            $w += $n;
        }
    }

    private function cmd(string $line, array $ok, bool $secret = false): string
    {
        $this->write($line . "\r\n");
        return $this->expect($ok, $secret ? '(identifiants)' : $line);
    }

    private function expect(array $ok, string $ctx = ''): string
    {
        $resp = '';
        while (($line = fgets($this->fp, 1024)) !== false) {
            $resp .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        if ($resp === '') throw new RuntimeException('SMTP: pas de réponse du serveur');
        $code = (int) substr($resp, 0, 3);
        if (!in_array($code, $ok, true)) {
            throw new RuntimeException('SMTP: réponse inattendue après « ' . $ctx . ' » : ' . trim($resp));
        }
        return $resp;
    }
}

function mime_header(string $s): string
{
    return preg_match('/^[\x20-\x7e]*$/', $s) ? $s : '=?UTF-8?B?' . base64_encode($s) . '?=';
}

/** Envoie un e-mail texte via le pilote configuré. Lève une exception en cas d'échec. */
function send_mail(string $to, string $subject, string $body): void
{
    $from = (string) cfg('mail_from', '');
    $name = (string) cfg('mail_name', 'Umbratech');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('config: "mail_from" invalide');
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('destinataire invalide');

    if (cfg('mail_driver', 'smtp') === 'mail') {
        $headers = implode("\r\n", [
            'From: ' . mime_header($name) . " <$from>",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ]);
        if (!mail($to, mime_header($subject), $body, $headers, '-f' . $from)) throw new RuntimeException('mail() a échoué');
        return;
    }
    $helo = substr(strrchr($from, '@') ?: '@localhost', 1);
    (new Smtp(
        (string) cfg('smtp_host', ''), (int) cfg('smtp_port', 587), (string) cfg('smtp_secure', 'starttls'),
        (string) cfg('smtp_user', ''), (string) cfg('smtp_pass', ''), $helo
    ))->send($from, $name, $to, $subject, $body);
}
