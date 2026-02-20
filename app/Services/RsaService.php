<?php
namespace App\Services;

class RsaService
{
    /**
     * Generate RSA key pair.
     *
     * @param int $bits
     * @return array ['private' => string PEM, 'public' => string PEM]
     * @throws \Exception
     */
  public function generateKeyPair(int $bits = 2048): array
{
    $config = [
        "private_key_type" => OPENSSL_KEYTYPE_RSA,
        "private_key_bits" => $bits,
        "digest_alg"       => "sha256",
    ];

    $res = openssl_pkey_new($config);

    if ($res === false) {
        throw new \Exception(
            "OpenSSL Error: " . openssl_error_string()
        );
    }

    $privateKey = '';
    openssl_pkey_export($res, $privateKey);

    $details = openssl_pkey_get_details($res);
    if ($details === false) {
        throw new \Exception("Failed getting public key details.");
    }

    $publicKey = $details['key'];

    return [
        'private' => $privateKey,
        'public'  => $publicKey
    ];
}


    /**
     * Encrypt data with public key (RSA-OAEP recommended)
     *
     * @param string $publicKeyPem
     * @param string $plaintext
     * @return string base64 ciphertext
     * @throws \Exception
     */
    public function encryptWithPublicKey(string $publicKeyPem, string $plaintext): string
    {
        $pubKey = openssl_pkey_get_public($publicKeyPem);
        if ($pubKey === false) {
            throw new \Exception('Invalid public key provided.');
        }

        $ok = openssl_public_encrypt($plaintext, $encrypted, $pubKey, OPENSSL_PKCS1_OAEP_PADDING);
        if (!$ok) {
            throw new \Exception('Public encrypt failed: ' . openssl_error_string());
        }

        return base64_encode($encrypted);
    }

    /**
     * Decrypt base64 ciphertext with private key
     *
     * @param string $privateKeyPem
     * @param string $ciphertextB64
     * @return string plaintext
     * @throws \Exception
     */
    public function decryptWithPrivateKey(string $privateKeyPem, string $ciphertextB64): string
    {
        $privKey = openssl_pkey_get_private($privateKeyPem);
        if ($privKey === false) {
            throw new \Exception('Invalid private key provided.');
        }

        $ciphertext = base64_decode($ciphertextB64, true);
        if ($ciphertext === false) {
            throw new \Exception('Invalid base64 ciphertext.');
        }

        $ok = openssl_private_decrypt($ciphertext, $decrypted, $privKey, OPENSSL_PKCS1_OAEP_PADDING);
        if (!$ok) {
            // if decryption fails, include OpenSSL error for debugging (but don't show to end-users in prod)
            throw new \Exception('Private decrypt failed: ' . openssl_error_string());
        }

        return $decrypted;
    }
}
